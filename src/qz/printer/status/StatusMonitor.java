package qz.printer.status;

import com.sun.jna.platform.win32.Winspool;
import com.sun.jna.platform.win32.WinspoolUtil;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;
import org.eclipse.jetty.util.MultiMap;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.jetty.websocket.api.Session;
import qz.printer.PrintServiceMatcher;
import qz.printer.info.NativePrinterMap;
import qz.utils.PrintingUtilities;
import qz.utils.SystemUtilities;
import qz.ws.SocketConnection;

import java.util.*;

import static qz.utils.SystemUtilities.isWindows;

/**
 * Created by Kyle on 2/23/2017.
 */
public class StatusMonitor {
    private static final Logger log = LogManager.getLogger(StatusMonitor.class);

    public static final String ALL_PRINTERS = "";

    private static Thread printerConnectionsThread;
    private static Thread statusEventDispatchThread;
    private static final HashMap<String,Thread> notificationThreadCollection = new HashMap<>();
    private static final HashMap<SocketConnection, StatusSession> statusSessions = new HashMap<>();
    private static final MultiMap<SocketConnection> clientPrinterConnections = new MultiMap<>();
    private static final LinkedList<Status> statusQueue = new LinkedList();

    public synchronized static boolean launchNotificationThreads() {
        ArrayList<String> printerNameList = new ArrayList<>();

        Winspool.PRINTER_INFO_2[] printers = WinspoolUtil.getPrinterInfo2();
        for (Winspool.PRINTER_INFO_2 printer : printers) {
            printerNameList.add(printer.pPrinterName);
            if (!notificationThreadCollection.containsKey(printer.pPrinterName)) {
                Thread notificationThread = new WmiPrinterStatusThread(printer);
                notificationThreadCollection.put(printer.pPrinterName, notificationThread);
                notificationThread.start();
            }
        }
        //interrupt threads that don't have associated printers
        for (Map.Entry<String,Thread> e : notificationThreadCollection.entrySet()) {
            if (!printerNameList.contains(e.getKey())) {
                e.getValue().interrupt();
                notificationThreadCollection.remove(e.getKey());
            }
        }

        if (printerConnectionsThread == null) {
            printerConnectionsThread = new WmiPrinterConnectionsThread();
            printerConnectionsThread.start();
        }

        return true;
    }

    public synchronized static void relaunchThreads() {
        launchNotificationThreads();
    }

    public synchronized static void closeNotificationThreads() {
        for (Thread t : notificationThreadCollection.values()) {
            t.interrupt();
        }
        notificationThreadCollection.clear();

        if (printerConnectionsThread != null) {
            printerConnectionsThread.interrupt();
            printerConnectionsThread = null;
        }
    }

    public synchronized static boolean isListening(SocketConnection connection) {
        return statusSessions.containsKey(connection);
    }

    public synchronized static boolean startListening(SocketConnection connection, Session session, JSONObject params) throws JSONException {
        statusSessions.putIfAbsent(connection, new StatusSession(session));
        JSONArray printerNames = params.getJSONArray("printerNames");

        if (printerNames.isNull(0)) {  //listen to all printers
            addClientPrinterConnection(ALL_PRINTERS, connection, params);
        } else {  // listen to specific printer(s)
            for (int i = 0; i < printerNames.length(); i++) {
                String printerName = printerNames.getString(i);
                if (SystemUtilities.isMac()) printerName = macNameFix(printerName);

                if (printerName == null || printerName.equals("")) {
                    throw new IllegalArgumentException();
                }
                addClientPrinterConnection(printerName, connection, params);
            }
        }

        if (isWindows()) {
            return launchNotificationThreads();
        } else {
            if (!CupsStatusServer.isRunning()) { CupsStatusServer.runServer(); }
            return true;
        }
    }

    public synchronized static void stopListening(SocketConnection connection) {
        statusSessions.remove(connection);
        closeListener(connection);
    }

    private synchronized static void addClientPrinterConnection(String printerName, SocketConnection connection, JSONObject params) {
        boolean jobData = params.optBoolean("jobData", false);
        int maxJobData = params.optInt("maxJobData", -1);
        PrintingUtilities.Flavor dataFlavor = PrintingUtilities.Flavor.parse(params, PrintingUtilities.Flavor.PLAIN);

        if (jobData) {
            statusSessions.get(connection).enableJobDataOnPrinter(printerName, maxJobData, dataFlavor);
        }
        if (!clientPrinterConnections.containsKey(printerName)) {
            clientPrinterConnections.add(printerName, connection);
        } else if (!clientPrinterConnections.getValues(printerName).contains(connection)) {
            clientPrinterConnections.add(printerName, connection);
        }
    }

    public synchronized static void sendStatuses(SocketConnection connection) {
        boolean sendForAllPrinters = false;
        ArrayList<Status> statuses = isWindows() ? WmiPrinterStatusThread.getAllStatuses(): CupsUtils.getAllStatuses();

        List<SocketConnection> connections = clientPrinterConnections.get(ALL_PRINTERS);
        if (connections != null) {
            sendForAllPrinters = connections.contains(connection);
        }

        for (Status status : statuses) {
            if (sendForAllPrinters) {
                statusSessions.get(connection).statusChanged(status);
            } else {
                connections = clientPrinterConnections.get(status.getPrinter());
                if ((connections != null) && connections.contains(connection)) {
                    statusSessions.get(connection).statusChanged(status);
                }
            }
        }
    }

    public synchronized static void closeListener(SocketConnection connection) {
        for (Iterator<Map.Entry<String, List<SocketConnection>>> i = clientPrinterConnections.entrySet().iterator(); i.hasNext();) {
            if (i.next().getValue().contains(connection)) {
                i.remove();
            }
        }
        if (clientPrinterConnections.isEmpty()) {
            if (isWindows()) {
                closeNotificationThreads();
            } else {
                CupsStatusServer.stopServer();
            }
        }
    }

    private synchronized static void launchStatusEventDispatchThread() {
        if (statusEventDispatchThread != null && statusEventDispatchThread.isAlive()) return;
        statusEventDispatchThread = new Thread(() -> {
            while (!Thread.currentThread().isInterrupted() && dispatchStatusEvent()) {
                Thread.yield();
            }
            if (Thread.currentThread().isInterrupted()) log.warn("statusEventDispatchThread Interrupted");
        }, "statusEventDispatchThread");
        statusEventDispatchThread.start();
    }

    public synchronized static void statusChanged(Status[] statuses) {
        for (Status status : statuses) {
            statusQueue.add(status);
        }
        if (!statusQueue.isEmpty()) {
            launchStatusEventDispatchThread();
        }
    }

    private synchronized static boolean dispatchStatusEvent() {
        if (statusQueue.isEmpty()) {
            statusEventDispatchThread = null;
            return false;
        }
        Status status = statusQueue.removeFirst();

        HashSet<SocketConnection> listeningConnections = new HashSet<>();
        if (clientPrinterConnections.containsKey(status.getPrinter())) {
            listeningConnections.addAll(clientPrinterConnections.get(status.getPrinter()));
        }
        if (clientPrinterConnections.containsKey(ALL_PRINTERS)) {
            listeningConnections.addAll(clientPrinterConnections.get(ALL_PRINTERS));
        }
        for (SocketConnection connection : listeningConnections) {
            statusSessions.get(connection).statusChanged(status);
        }
        return true;
    }

    private static String macNameFix(String printerName) {
        // Since 2.0: Mac printers use descriptions as printer names; Find CUPS ID by Description
        String returnString = NativePrinterMap.getInstance().lookupPrinterId(printerName);
        // Handle edge-case where printer was recently renamed/added
        if (returnString == null) {
            // Call PrintServiceLookup.lookupPrintServices again
            PrintServiceMatcher.getNativePrinterList(true);
            returnString = NativePrinterMap.getInstance().lookupPrinterId(printerName);
        }
        return returnString;
    }
}
