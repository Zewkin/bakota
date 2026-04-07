import { Popup, Button, Toast } from 'antd-mobile';

interface Props {
  visible: boolean;
  message: string;
  onClose: () => void;
}

export default function BookingMessage({ visible, message, onClose }: Props) {
  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(message);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = message;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      Toast.show({ content: 'Скопійовано', icon: 'success' });
    } catch {
      Toast.show({ content: 'Не вдалося скопіювати', icon: 'fail' });
    }
  };

  return (
    <Popup visible={visible} onMaskClick={onClose} bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
      <div style={{ padding: 16 }}>
        <h4 style={{ marginBottom: 12 }}>SMS повідомлення</h4>
        <div
          style={{
            background: '#f5f5f5',
            padding: 12,
            borderRadius: 8,
            whiteSpace: 'pre-wrap',
            fontSize: 14,
            lineHeight: 1.6,
            marginBottom: 12,
          }}
        >
          {message}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button block color="primary" onClick={handleCopy}>Скопіювати</Button>
          <Button block onClick={onClose}>Закрити</Button>
        </div>
      </div>
    </Popup>
  );
}
