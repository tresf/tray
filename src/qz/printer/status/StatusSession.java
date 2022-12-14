package qz.printer.status;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.jetty.websocket.api.Session;
import qz.App;
import qz.printer.status.job.WmiJobStatusMap;
import qz.utils.*;
import qz.ws.PrintSocketClient;
import qz.ws.StreamEvent;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

public class StatusSession {
    private static final Logger log = LogManager.getLogger(StatusSession.class);
    private Session session;
    //todo investigate moving this to nativePrinter.
    private HashMap<String, Spooler> printerSpoolerMap = new HashMap<>();

    private static final String ALL_PRINTERS = "";

    private class Spooler {
        public Path path;
        public int maxJobData;
        public PrintingUtilities.Flavor dataFlavor;
        public Spooler(Path path, int maxJobData, PrintingUtilities.Flavor dataFlavor) {
            this.path = path;
            this.maxJobData = maxJobData;
            this.dataFlavor = dataFlavor;
        }
    }

    public StatusSession(Session session) {
        this.session = session;
    }

    public void statusChanged(Status status) {
        PrintSocketClient.sendStream(session, createStatusStream(status));
        // If this statusSession has printers flagged to return jobData, issue a jobData event after any 'retained' job events
        if (status.getCode() == WmiJobStatusMap.RETAINED.getParent() && isDataPrinter(status.getPrinter())) {
            PrintSocketClient.sendStream(session, createJobDataStream(status));
        }
    }

    public void enableJobDataOnPrinter(String printer, int maxJobData, PrintingUtilities.Flavor dataFlavor) throws UnsupportedOperationException {
        if (!SystemUtilities.isWindows()) {
            throw new UnsupportedOperationException("Job data listeners are only supported on Windows");
        }
        String spoolFileMonitoring = PrefsSearch.get(App.getTrayProperties(), "printer.status.jobdata", "false", false );
        if (!Boolean.parseBoolean(spoolFileMonitoring)) {
            throw new UnsupportedOperationException("Job data listeners are currently disabled");
        }
        if (printerSpoolerMap.containsKey(printer)) {
            printerSpoolerMap.get(printer).maxJobData = maxJobData;
        } else {
            // Lookup spooler path lazily
            printerSpoolerMap.put(printer, new Spooler(null, maxJobData, dataFlavor));
        }
        if (printer.equals(ALL_PRINTERS)) setAllPrintersMaxJobData(maxJobData);
    }

    private void setAllPrintersMaxJobData(int maxBytes) {
        for(Map.Entry<String, Spooler> entry : printerSpoolerMap.entrySet()) {
            entry.getValue().maxJobData = maxBytes;
        }
    }

    private int getAllPrintersMaxJobData() {
        if (printerSpoolerMap.containsKey(ALL_PRINTERS)) {
            return printerSpoolerMap.get(ALL_PRINTERS).maxJobData;
        }
        return -1;
    }

    private PrintingUtilities.Flavor getAllPrintersDataFlavor() {
        if (printerSpoolerMap.containsKey(ALL_PRINTERS)) {
            return printerSpoolerMap.get(ALL_PRINTERS).dataFlavor;
        }
        return PrintingUtilities.Flavor.PLAIN;
    }

    private StreamEvent createJobDataStream(Status status) {
        StreamEvent streamEvent = new StreamEvent(StreamEvent.Stream.PRINTER, StreamEvent.Type.ACTION)
                .withData("printerName", status.sanitizePrinterName())
                .withData("eventType", Status.EventType.JOB_DATA)
                .withData("jobID", status.getJobId())
                .withData("jobName", status.getJobName())
                .withData("data", getJobData(status.getJobId(), status.getPrinter()));
        return streamEvent;
    }

    private StreamEvent createStatusStream(Status status) {
        StreamEvent streamEvent = new StreamEvent(StreamEvent.Stream.PRINTER, StreamEvent.Type.ACTION)
                .withData("printerName", status.sanitizePrinterName())
                .withData("eventType", status.getEventType())
                .withData("statusText", status.getCode().name())
                .withData("severity", status.getCode().getLevel())
                .withData("statusCode", status.getRawCode())
                .withData("message", status.toString());
        if(status.getJobId() > 0) {
            streamEvent.withData("jobId", status.getJobId());
        }
        if(status.getJobName() != null) {
            streamEvent.withData("jobName", status.getJobName());
        }
        return streamEvent;
    }

    private String getJobData(int jobId, String printer) {
        String data = null;
        try {
            if (!printerSpoolerMap.containsKey(printer)) {
                printerSpoolerMap.put(printer, new Spooler(null, getAllPrintersMaxJobData(), getAllPrintersDataFlavor()));
            }
            Spooler spooler = printerSpoolerMap.get(printer);
            if (spooler.path == null) spooler.path = WindowsUtilities.getSpoolerLocation(printer);
            if (spooler.maxJobData != -1 && Files.size(spooler.path) > spooler.maxJobData) {
                throw new IOException("File too large, omitting result. Size:" + Files.size(spooler.path) + " MaxJobData:" + spooler.maxJobData);
            }
            data = spooler.dataFlavor.toString(Files.readAllBytes(spooler.path.resolve(String.format("%05d", jobId) + ".SPL")));
        }
        catch(IOException e) {
            log.error("Failed to retrieve job data from job #{}", jobId, e);
        }
        return data;
    }

    private boolean isDataPrinter(String printer) {
        return (printerSpoolerMap.containsKey(ALL_PRINTERS) || printerSpoolerMap.containsKey(printer));
    }
}
