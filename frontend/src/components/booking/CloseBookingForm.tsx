import { useState } from 'react';
import { Popup, Form, Input, Button, Selector } from 'antd-mobile';
import { ALLOWED_DISCOUNTS } from '@/types';
import type { CloseBookingPayload } from '@/api/bookings';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CloseBookingPayload) => Promise<void>;
  currentDiscount?: number;
}

export default function CloseBookingForm({ visible, onClose, onSubmit, currentDiscount }: Props) {
  const [instructor, setInstructor] = useState('');
  const [soldpriceType, setSoldpriceType] = useState(0);
  const [soldprice, setSoldprice] = useState('');
  const [discount, setDiscount] = useState(currentDiscount ?? 0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!instructor) return;
    setLoading(true);
    try {
      await onSubmit({
        instructor,
        soldprice_type: soldpriceType,
        soldprice: soldprice ? Number(soldprice) : undefined,
        discount,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popup visible={visible} onMaskClick={onClose} bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
      <div style={{ padding: 16 }}>
        <h4 style={{ marginBottom: 12 }}>Надано</h4>
        <Form layout="horizontal">
          <Form.Item label="Інструктор">
            <Input value={instructor} onChange={setInstructor} placeholder="Ім'я інструктора" />
          </Form.Item>
          <Form.Item label="Тип оплати">
            <Selector
              options={[
                { label: 'Готівка', value: 0 },
                { label: 'Безготівка', value: 1 },
              ]}
              value={[soldpriceType]}
              onChange={(v) => setSoldpriceType(v[0] ?? 0)}
            />
          </Form.Item>
          <Form.Item label="Сума (вручну)">
            <Input type="number" value={soldprice} onChange={setSoldprice} placeholder="Авто-розрахунок" />
          </Form.Item>
          <Form.Item label="Знижка">
            <Selector
              options={ALLOWED_DISCOUNTS.map((d) => ({ label: d === 0 ? '0%' : `${d}%`, value: d }))}
              value={[discount]}
              onChange={(v) => setDiscount(v[0] ?? 0)}
            />
          </Form.Item>
        </Form>
        <Button block color="primary" loading={loading} onClick={handleSubmit} style={{ marginTop: 12 }}>
          Зберегти
        </Button>
      </div>
    </Popup>
  );
}
