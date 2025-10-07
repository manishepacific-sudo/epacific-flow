import { useSettings } from './useSettings';

interface SessionTimeoutSettings {
  timeoutMinutes: number;
  warningMinutes: number;
}

const DEFAULT_TIMEOUT_MINUTES = 30;
const DEFAULT_WARNING_MINUTES = 5;

export function useSessionTimeoutSettings(): SessionTimeoutSettings {
  const { data: sessionTimeout } = useSettings('session.timeout.duration');
  const { data: warningTime } = useSettings('session.timeout.warning');

  return {
    timeoutMinutes: sessionTimeout ?? DEFAULT_TIMEOUT_MINUTES,
    warningMinutes: warningTime ?? DEFAULT_WARNING_MINUTES,
  };
}