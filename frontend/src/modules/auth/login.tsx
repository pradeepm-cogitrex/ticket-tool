import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, Ticket } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { Field } from '@/shared/components/form/field';
import { TextInput } from '@/shared/components/form/text-input';
import { errorMessage } from '@/shared/services/api.service';
import { useAuth } from './auth-context';
import './login.css';

const DEMO = { email: 'cogitrex@gmail.com', password: 'cogitrex' };

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  if (user) return <Navigate to={from} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your email and password');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <section className="login__art" aria-hidden>
        <div className="login__grid" />
        <div className="login__orb" />
        <div className="brand login__brand">
          <span className="brand__mark">
            <Ticket />
          </span>
          <span className="brand__name">
            Ticket<em>Desk</em>
          </span>
        </div>

        <div className="login__pitch">
          <h1>
            Every issue,
            <br />
            tracked to <span>done.</span>
          </h1>
          <p>A platform to raise, manage, track, and resolve every support request</p>
        </div>

        <div className="float-stack">
          <div className="float-ticket float-ticket--1">
            <div className="float-ticket__top">
              <span className="float-ticket__no">TKT-2026-00128</span>
              <span className="float-ticket__chip" style={{ ['--c' as string]: '#3b6fe0' }}>
                Open
              </span>
            </div>
            <div className="float-ticket__title">Leave balance not updating after approval</div>
            <div className="float-ticket__meta">ravi.kumar · HRMS · High</div>
          </div>
          <div className="float-ticket float-ticket--2">
            <div className="float-ticket__top">
              <span className="float-ticket__no">TKT-2026-00127</span>
              <span className="float-ticket__chip" style={{ ['--c' as string]: '#e08a00' }}>
                In Progress
              </span>
            </div>
            <div className="float-ticket__title">Bot replies in English when asked in Telugu</div>
            <div className="float-ticket__meta">priya.s · AI BOT · Due in 3h</div>
          </div>
          <div className="float-ticket float-ticket--3">
            <div className="float-ticket__top">
              <span className="float-ticket__no">TKT-2026-00126</span>
              <span className="float-ticket__chip" style={{ ['--c' as string]: '#12a150' }}>
                Resolved
              </span>
            </div>
            <div className="float-ticket__title">Payslip PDF download fails</div>
            <div className="float-ticket__meta">anil.m · HRMS · Met SLA</div>
          </div>
        </div>
      </section>

      <section className="login__panel">
        <form className="login__form" onSubmit={submit} noValidate>
          <div className="login__mobile-brand brand">
            <span className="brand__mark">
              <Ticket />
            </span>
            <span className="brand__name">
              Ticket<em>Desk</em>
            </span>
          </div>
          <h2>Sign in</h2>
          {error && (
            <div className="alert" role="alert">
              <AlertCircle /> {error}
            </div>
          )}

          <Field label="Email" htmlFor="login-email">
            <TextInput
              id="login-email" placeholder="Enter Email"
              type="email"
              icon={<Mail />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </Field>
          <Field label="Password" htmlFor="login-password">
            <div className="input-wrap">
              <Lock />
              <input
                id="login-password" placeholder="Enter Password"
                className="input"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
              />
              <button type="button" className="input-wrap__clear" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

          <Button type="submit" variant="primary" size="lg" block loading={loading}>
            Sign in <ArrowRight />
          </Button>

          {/* {import.meta.env.DEV && (
            <button
              type="button"
              className="login__demo"
              onClick={() => {
                setEmail(DEMO.email);
                setPassword(DEMO.password);
                setError(null);
              }}
            >
              <span>Development login</span>
              <code>
                {DEMO.email} · {DEMO.password}
              </code>
              <small>Click to fill in</small>
            </button>
          )} */}
        </form>
      </section>
    </div>
  );
}
