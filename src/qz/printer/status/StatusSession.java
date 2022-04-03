package qz.printer.status;

import org.eclipse.jetty.websocket.api.Session;
import qz.ws.PrintSocketClient;
import qz.ws.StreamEvent;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

public class StatusSession {
    private Session session;
    private List<String> dataPrinters = new ArrayList();

    private static final String ALL_PRINTERS = "";

    public StatusSession(Session session) {
        this.session = session;
    }

    public void statusChanged(Status status) {
        PrintSocketClient.sendStream(session, createStatusStream(status));
        //todo: don't so a string compare here, use the status object from getCode
        if (status.getCode().name().equals("RETAINED") && isDataPrinter(status.getPrinter())) {
            PrintSocketClient.sendStream(session, createJobDataStream(status));
        }
    }

    public void enableDataOnPrinter(String printer) {
        if (!dataPrinters.contains(printer)) dataPrinters.add(printer);
    }

    private StreamEvent createJobDataStream(Status status) {
        StreamEvent streamEvent = new StreamEvent(StreamEvent.Stream.JOB_DATA, StreamEvent.Type.ACTION)
                .withData("printerName", status.sanitizePrinterName())
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
            //todo pull this from reg and figure out encoding. also probably move this
            Path p = Paths.get("C:\\Windows\\System32\\spool\\PRINTERS", String.format("%05d", jobId) + ".SPL");
            data = new String(Files.readAllBytes(p));
        }
        catch(IOException e) {
            e.printStackTrace();
        }
        return data;
    }

    private boolean isDataPrinter(String printer) {
        return (dataPrinters.contains(ALL_PRINTERS) || dataPrinters.contains(printer));
    }
}
