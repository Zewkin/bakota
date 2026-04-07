import { useState } from 'react';
import { Button, Form, Input, Toast } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { login } from '@/api/auth';
import { useAuthStore } from '@/stores/auth';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const onFinish = async (values: { login: string; password: string }) => {
    setLoading(true);
    try {
      const res = await login(values.login, values.password);
      setAuth(res.data.token, res.data.user as any);
      navigate('/', { replace: true });
    } catch (err: any) {
      Toast.show({ content: err.response?.data?.message || 'Помилка входу', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100dvh', padding: 24 }}>
      <h2 style={{ textAlign: 'center', marginBottom: 32 }}>CRM Bakota</h2>
      <Form onFinish={onFinish} footer={
        <Button block type="submit" color="primary" loading={loading} size="large">
          Увійти
        </Button>
      }>
        <Form.Item name="login" label="Логін" rules={[{ required: true, message: 'Введіть логін' }]}>
          <Input placeholder="login" autoComplete="username" />
        </Form.Item>
        <Form.Item name="password" label="Пароль" rules={[{ required: true, message: 'Введіть пароль' }]}>
          <Input type="password" placeholder="••••••" autoComplete="current-password" />
        </Form.Item>
      </Form>
    </div>
  );
}
