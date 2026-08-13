"use strict";
/* Visible-device polling and Realtime recovery for encrypted Cloud Sync. */
(function financeCloudSyncLifecycleBootstrap() {
  const FOREGROUND_POLL_MS = 30 * 1000;
  const REALTIME_RETRY_MAX_MS = 30 * 1000;

  function create({ canPoll, canRetry, pull, reconnect }) {
    let foregroundPollTimer = null;
    let realtimeRetryTimer = null;
    let realtimeRetryAttempts = 0;

    function clearForegroundPoll() {
      clearTimeout(foregroundPollTimer);
      foregroundPollTimer = null;
    }

    function scheduleForegroundPoll(delay = FOREGROUND_POLL_MS) {
      clearForegroundPoll();
      if (!canPoll()) return;
      foregroundPollTimer = setTimeout(() => {
        Promise.resolve(pull("foreground-poll")).catch(() => {}).finally(() => scheduleForegroundPoll());
      }, Math.max(1000, Number(delay || FOREGROUND_POLL_MS)));
    }

    function clearRealtimeRetry({ resetAttempts = false } = {}) {
      clearTimeout(realtimeRetryTimer);
      realtimeRetryTimer = null;
      if (resetAttempts) realtimeRetryAttempts = 0;
    }

    function scheduleRealtimeRecovery(status = "Disconnected") {
      if (!canRetry()) return;
      clearRealtimeRetry();
      realtimeRetryAttempts += 1;
      const delay = Math.min(REALTIME_RETRY_MAX_MS, 1000 * (2 ** Math.min(realtimeRetryAttempts - 1, 5)));
      realtimeRetryTimer = setTimeout(async () => {
        if (!canRetry()) return;
        if (!canPoll()) {
          scheduleRealtimeRecovery(status);
          return;
        }
        try {
          await reconnect();
          await pull("realtime-recovery");
        } catch (error) {
          scheduleRealtimeRecovery(status);
        }
      }, delay);
    }

    function noteRealtimeSubscribed() {
      clearRealtimeRetry({ resetAttempts:true });
    }

    return {
      clearForegroundPoll,
      scheduleForegroundPoll,
      clearRealtimeRetry,
      scheduleRealtimeRecovery,
      noteRealtimeSubscribed
    };
  }

  window.FinanceCloudSyncLifecycle = { create, FOREGROUND_POLL_MS };
})();
