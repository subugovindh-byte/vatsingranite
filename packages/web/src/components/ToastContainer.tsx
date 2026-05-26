import { useToastStore } from '../store';

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();
  if (!toasts.length) return null;
  return (
    <div className="toast-area">
      {toasts.map((t) => (
        <div key={t.id} className={`toast${t.type === 'error' ? ' err' : t.type === 'warn' ? ' warn' : ''}`} onClick={() => dismiss(t.id)}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
