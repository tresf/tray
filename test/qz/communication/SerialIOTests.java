package qz.communication;

import jssc.*;
import org.codehaus.jettison.json.JSONObject;
import org.testng.Assert;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public class SerialIOTests {
    private static final String PORT_NAME = "TEST_PORT";
    private static final int EXPECTED_READ_TIMEOUT = 1200;

    private static void expectSerialPortException(SerialAction action) throws Exception {
        try {
            action.run();
            Assert.fail("Expected SerialPortException");
        } catch (SerialPortException expected) {
        }
    }

    private SerialIO serial;
    private FakeSerialPort fake;

    @BeforeMethod
    public SerialIO setUp() throws SerialPortException {
        serial = new SerialIO(PORT_NAME, null, FakeSerialPort::new);
        serial.open(new SerialOptions());
        fake = (FakeSerialPort)serial.getPort();

        return serial;
    }

    @Test
    public void closeShouldIgnoreAlreadyClosedSerial() {
        serial.close();

        Assert.assertEquals(fake.closeCalls, 0);
        Assert.assertFalse(serial.isOpen());
    }

    @Test
    public void closeShouldOnlyCloseNativePortOnce() throws Exception {
        serial.close();
        serial.close();

        Assert.assertEquals(fake.closeCalls, 1);
        Assert.assertFalse(serial.isOpen());
    }

    @Test
    public void sendDataAfterCloseShouldNotWriteToNativePort() throws Exception {
        serial.close();

        expectSerialPortException(() -> serial.sendData(new JSONObject().put("data", "hello"), null));
        Assert.assertEquals(fake.writeCalls, 0);
    }

    @Test
    public void processSerialEventAfterCloseShouldNotReadNativePort() throws Exception {
        serial.close();
        String output = serial.processSerialEvent(new SerialPortEvent(serial.getPort(), SerialPort.MASK_RXCHAR, 5));

        Assert.assertNull(output);
        Assert.assertEquals(fake.readCalls, 0);
    }

    @Test
    public void processSerialEventShouldUseConfiguredReadTimeout() {
        fake.timeoutOnRead = true;

        String output = serial.processSerialEvent(new SerialPortEvent(fake, SerialPort.MASK_RXCHAR, 5));

        Assert.assertNull(output);
        Assert.assertEquals(fake.readCalls, 1);
        Assert.assertEquals(fake.lastReadTimeout, EXPECTED_READ_TIMEOUT);
        Assert.assertTrue(serial.isOpen());
    }

    @Test
    public void closePortFalseShouldCloseQzStatePredictably() throws Exception {
        fake.closeResult = false;
        serial.close();

        Assert.assertEquals(fake.closeCalls, 1);
        Assert.assertFalse(serial.isOpen());
        expectSerialPortException(() -> serial.sendData(new JSONObject().put("data", "hello"), null));
        Assert.assertEquals(fake.writeCalls, 0);
    }

    @Test
    public void closePortExceptionShouldCloseQzStatePredictably() throws Exception {
        fake.throwOnClose = true;
        serial.close();

        Assert.assertEquals(fake.closeCalls, 1);
        Assert.assertFalse(serial.isOpen());
        expectSerialPortException(() -> serial.sendData(new JSONObject().put("data", "hello"), null));
        Assert.assertEquals(fake.writeCalls, 0);
    }

    @Test
    public void pendingReadResultShouldBeIgnoredAfterCloseRequest() throws Exception {
        fake.readBytes = "late data".getBytes(StandardCharsets.UTF_8);
        fake.blockRead = true;

        final String[] output = new String[1];
        final SerialPortEvent serialPortEvent = new SerialPortEvent(fake, SerialPort.MASK_RXCHAR, fake.readBytes.length);
        Thread reader = new Thread(() -> output[0] = serial.processSerialEvent(serialPortEvent));
        reader.start();

        // Hold readBytes open so close can
        // move QZ state to CLOSED first
        Assert.assertTrue(fake.readStarted.await(2, TimeUnit.SECONDS), "Timed out waiting for fake read");
        serial.close();
        fake.releaseRead.countDown();
        reader.join(2000);

        Assert.assertFalse(reader.isAlive(), "Reader thread did not finish");
        Assert.assertNull(output[0]);
        Assert.assertEquals(fake.readCalls, 1);
        Assert.assertFalse(serial.isOpen());
    }

    @Test
    public void reopenAfterSuccessfulCloseShouldUseNewNativePort() throws Exception {
        FakeSerialPort first = new FakeSerialPort(PORT_NAME);
        FakeSerialPort second = new FakeSerialPort(PORT_NAME);

        Assert.assertTrue(serial.open(new SerialOptions()));
        serial.close();
        Assert.assertFalse(serial.isOpen());

        Assert.assertTrue(serial.open(new SerialOptions()));
        Assert.assertTrue(serial.isOpen());
        Assert.assertEquals(first.closeCalls, 1);
        Assert.assertEquals(second.openCalls, 1);
    }

    @Test
    public void failedCloseShouldAllowClearReopenAttempt() throws Exception {
        SerialIO serial1 = setUp();
        FakeSerialPort fake1 = (FakeSerialPort)serial1.getPort();

        fake1.closeResult = false;

        Assert.assertTrue(serial1.open(new SerialOptions()));
        serial1.close();
        Assert.assertFalse(serial1.isOpen());

        SerialIO serial2 = setUp();
        FakeSerialPort fake2 = (FakeSerialPort)serial1.getPort();

        // QZ releases its stale adapter so a later
        // open gets a clean native attempt
        Assert.assertTrue(serial2.open(new SerialOptions()));
        Assert.assertTrue(serial2.isOpen());
        Assert.assertEquals(fake1.closeCalls, 1);
        Assert.assertEquals(fake2.openCalls, 1);
    }

    // Lets expectSerialPortException accept
    // lambdas with checked exceptions
    private interface SerialAction {
        void run() throws Exception;
    }

    // Small fake instead of a mock
    // this avoids adding a test dependency for one narrow seam
    // Model only the JSSC behavior SerialIO owns
    // and that keeps the testing hardware-free
    private static class FakeSerialPort extends SerialPort {
        boolean opened;
        boolean closeResult = true;
        boolean throwOnClose;
        boolean timeoutOnRead;
        boolean blockRead;
        byte[] readBytes = new byte[0];
        int openCalls;
        int closeCalls;
        int readCalls;
        int writeCalls;
        int lastReadTimeout;
        CountDownLatch readStarted = new CountDownLatch(1);
        CountDownLatch releaseRead = new CountDownLatch(1);

        public FakeSerialPort(String portName) {
            super(portName);
        }

        @Override
        public boolean openPort() {
            openCalls++;
            opened = true;
            return true;
        }

        @Override
        public boolean closePort() throws SerialPortException {
            closeCalls++;
            if (throwOnClose) {
                throw new SerialPortException(this, "closePort", "test close failure");
            }
            opened = false;
            return closeResult;
        }

        @Override
        public boolean isOpened() {
            return opened;
        }

        @Override
        public void addEventListener(SerialPortEventListener listener) {
            // Listener behavior is not part of this lifecycle test
            // accepting registration keeps open setup realistic
        }

        @Override
        public boolean setParams(int baudRate, int dataBits, int stopBits, int parity) {
            // Option application is not under test here
            // allow setup to continue
            return true;
        }

        @Override
        public boolean setFlowControlMode(int mask) {
            // Flow control is outside the
            // lifecycle behavior these tests exercise
            return true;
        }

        @Override
        public boolean writeBytes(byte[] data) {
            writeCalls++;
            return true;
        }

        @Override
        public byte[] readBytes(int byteCount, int timeout) throws SerialPortTimeoutException {
            readCalls++;
            lastReadTimeout = timeout;
            if (blockRead) {
                readStarted.countDown();
                try {
                    releaseRead.await(2, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
            if (timeoutOnRead) {
                throw new SerialPortTimeoutException(this, "readBytes", timeout);
            }
            return readBytes;
        }
    }
}
