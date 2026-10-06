import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import Mock, patch


spec = importlib.util.spec_from_file_location("tui_smoke", Path(__file__).with_name("tui-smoke.py"))
tui_smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tui_smoke)


class WindowsTerminalCloseTests(unittest.TestCase):
    def setUp(self):
        self.terminal = tui_smoke.Terminal.__new__(tui_smoke.Terminal)
        self.process = Mock(pid=12345)
        self.process.pty.isalive.return_value = False
        self.terminal.process = self.process
        self.windows = patch.object(tui_smoke.os, "name", "nt")
        self.windows.start()
        self.addCleanup(self.windows.stop)
        taskkill = patch.object(tui_smoke.subprocess, "run")
        self.taskkill = taskkill.start()
        self.taskkill.return_value.returncode = 0
        self.addCleanup(taskkill.stop)

    def test_waits_for_conpty_exit_before_closing(self):
        self.process.pty.isalive.side_effect = [True, True, False]

        def close(force):
            if self.process.pty.isalive.call_count < 3:
                raise PermissionError(5, "Access is denied")
            self.assertTrue(force)

        self.process.close.side_effect = close
        with patch.object(tui_smoke.time, "sleep") as sleep:
            self.terminal.close()
        self.assertEqual(sleep.call_count, 2)
        self.process.close.assert_called_once_with(force=True)
        self.process.isalive.assert_not_called()
        self.taskkill.assert_called_once_with(
            ["taskkill", "/PID", "12345", "/T", "/F"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False, timeout=5,
        )

    def test_already_exited_process_still_closes_resources(self):
        with patch.object(tui_smoke.time, "sleep") as sleep:
            self.terminal.close()
        sleep.assert_not_called()
        self.process.close.assert_called_once_with(force=True)
        self.process.isalive.assert_not_called()

    def test_taskkill_failure_is_harmless_when_process_has_exited(self):
        self.taskkill.return_value.returncode = 128
        self.terminal.close()
        self.process.close.assert_called_once_with(force=True)

    def test_live_process_timeout_is_not_silenced(self):
        self.process.pty.isalive.return_value = True
        with patch.object(tui_smoke.time, "monotonic", side_effect=[10, 10, 15]), \
                patch.object(tui_smoke.time, "sleep"):
            with self.assertRaisesRegex(RuntimeError, "Windows PTY process did not exit after taskkill"):
                self.terminal.close()
        self.process.close.assert_not_called()
        self.process.fileobj.close.assert_called_once()
        self.process._server.close.assert_called_once()

    def test_taskkill_timeout_is_not_silenced(self):
        self.taskkill.side_effect = subprocess.TimeoutExpired("taskkill", 5)
        with self.assertRaises(subprocess.TimeoutExpired):
            self.terminal.close()
        self.process.close.assert_not_called()
        self.process.fileobj.close.assert_called_once()
        self.process._server.close.assert_called_once()

    def test_close_errors_are_not_silenced(self):
        self.process.close.side_effect = PermissionError(5, "Access is denied")
        with self.assertRaises(PermissionError):
            self.terminal.close()
        self.process.fileobj.close.assert_called_once()
        self.process._server.close.assert_called_once()


@unittest.skipUnless(os.name == "nt", "requires Windows ConPTY")
class WindowsTerminalCloseIntegrationTests(unittest.TestCase):
    def spawn(self, script, directory):
        env = {key: value for key, value in os.environ.items()
               if key.upper() in {"PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"}}
        return tui_smoke.Terminal([sys.executable, "-u", "-c", script], Path(directory), env)

    def assert_closed(self, terminal):
        self.assertFalse(terminal.process.pty.isalive())
        self.assertTrue(terminal.process.closed)
        self.assertEqual(terminal.process.fileobj.fileno(), -1)
        self.assertEqual(terminal.process._server.fileno(), -1)

    def test_repeated_live_process_cleanup(self):
        with tempfile.TemporaryDirectory() as directory:
            for iteration in range(5):
                with self.subTest(iteration=iteration):
                    terminal = self.spawn("import time; time.sleep(60)", directory)
                    self.addCleanup(terminal.close)
                    terminal.close()
                    self.assert_closed(terminal)

    def test_already_exited_process_cleanup(self):
        with tempfile.TemporaryDirectory() as directory:
            terminal = self.spawn("print('finished')", directory)
            self.addCleanup(terminal.close)
            deadline = time.monotonic() + 5
            while terminal.process.pty.isalive() and time.monotonic() < deadline:
                time.sleep(0.05)
            self.assertFalse(terminal.process.pty.isalive())
            terminal.close()
            self.assert_closed(terminal)


if __name__ == "__main__":
    unittest.main()
