import { useEffect, useMemo, useState } from 'react';
import { Popup, Form, Input, Button, Selector } from 'antd-mobile';
import { ALLOWED_DISCOUNTS } from '@/types';
import { formatPrice } from '@/utils/format';
import type { CloseBookingPayload } from '@/api/bookings';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CloseBookingPayload) => Promise<void>;
  currentDiscount?: number;
  productPrice?: number;
  pax?: number;
  currentSoldprice?: number | null;
}

export default function CloseBookingForm({ visible, onClose, onSubmit, currentDiscount, productPrice, pax = 1, currentSoldprice }: Props) {
  const [instructor, setInstructor] = useState('');
  const [soldpriceType, setSoldpriceType] = useState(0);
  const [discount, setDiscount] = useState(currentDiscount ?? 0);
  const [soldprice, setSoldprice] = useState(currentSoldprice != null ? Number(currentSoldprice).toFixed(0) : '');
  const [priceManual, setPriceManual] = useState(currentSoldprice != null);
  const [loading, setLoading] = useState(false);

  const calculatedSoldprice = useMemo(
    () => Number(productPrice || 0) * pax * (1 - discount / 100),
    [productPrice, pax, discount]
  );

  useEffect(() => {
    if (!priceManual) {
      setSoldprice(calculatedSoldprice.toFixed(0));
    }
  }, [calculatedSoldprice, priceManual]);

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
          {productPrice !== undefined && (
            <Form.Item label="Ціна продукту">
              <span>{formatPrice(productPrice)} / pax</span>
            </Form.Item>
          )}
          <Form.Item label="Сума">
            <Input
              type="number"
              value={soldprice}
              onChange={(value) => {
                setSoldprice(value);
                setPriceManual(true);
              }}
              placeholder="0"
            />
          </Form.Item>
          <Form.Item label="Знижка">
            <Selector
              options={ALLOWED_DISCOUNTS.map((d) => ({ label: d === 0 ? '0%' : `${d}%`, value: d }))}
              value={[discount]}
              onChange={(v) => {
                setDiscount(v[0] ?? 0);
                setPriceManual(false);
              }}
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
