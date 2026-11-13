import React, { createContext, useContext, useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate } from "react-router";
import { io } from "socket.io-client";
import { api, send, loadCheckout, streamAdvice } from "./api.js";
import {
  eventLoopDemo,
  hoistingDemo,
  makeCounter,
  callbackToPromise,
} from "./js-lab.js";
const Context = createContext();
const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n / 100);
const date = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
function Icon({ name = "tool", size = 22 }) {
  const paths = {
    tool: "M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4l-3 3-3-3 3-3Z",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    check: "m5 12 4 4L19 6",
    leaf: "M20 4C8 2 2 8 5 15c7 4 15-1 15-11ZM5 20 16 9",
    clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    bolt: "m13 2-9 12h7l-1 8 10-13h-7l0-7",
    phone: "M7 2h10v20H7zM10 18h4",
    laptop: "M4 4h16v12H4zM2 20h20",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    spark: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.tool} />
    </svg>
  );
}
function Button({ children, busy, ...props }) {
  return (
    <button {...props} disabled={busy || props.disabled}>
      {busy ? "Working…" : children}
    </button>
  );
}
function Notice({ children }) {
  return children ? (
    <div className="notice" role="alert">
      {children}
    </div>
  ) : null;
}
function Empty({ title, children }) {
  return (
    <div className="empty">
      <Icon name="leaf" size={40} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function Field({ label, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {props.rows ? <textarea {...props} /> : <input {...props} />}
    </label>
  );
}
// SSR starts with public data only. The effect resolves identity in the browser after hydration.
export default function App({ initial }) {
  const [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [config, setConfig] = useState({ mode: initial.mode });
  useEffect(() => {
    let active = true;
    api("/auth/me")
      .then((u) => active && setUser(u))
      .catch(() => {})
      .finally(() => active && setReady(true));
    api("/config")
      .then((c) => active && setConfig(c))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return (
    <Context.Provider
      value={{ user, setUser, ready, config, services: initial.services }}
    >
      <div className="shell">
        <Sidebar />
        <div className="main">
          <header className="topbar">
            <span className="topbar-label">
              GOOD THINGS DESERVE A SECOND LIFE
            </span>
            <div className="topbar-right">
              <span className="online-dot" />{" "}
              {config.mode === "demo" ? "Interactive demo" : "Repair studio"}
              <span className="avatar">{user?.name?.slice(0, 1) || "R"}</span>
              {user ? (
                <button
                  className="compact-auth text-button"
                  onClick={async () => {
                    await send("/auth/logout", {});
                    setUser(null);
                  }}
                >
                  Sign out
                </button>
              ) : (
                <Link className="compact-auth" to="/login">
                  Sign in
                </Link>
              )}
            </div>
          </header>
          {config.mode === "demo" && (
            <div className="demo-banner">
              Demo workspace · Data resets on restart · Payments and AI are
              simulated
            </div>
          )}
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/knowledge" element={<Knowledge />} />
              <Route path="/lab" element={<Lab />} />
              <Route path="/staff" element={<Staff />} />
              <Route
                path="*"
                element={
                  <Empty title="Page not found">
                    <Link to="/">Back to the studio</Link>
                  </Empty>
                }
              />
            </Routes>
          </main>
          <footer>
            RepairLoop <span>Repair more. Replace less.</span>
            <Link to="/lab">Inside the project ↗</Link>
          </footer>
        </div>
      </div>
    </Context.Provider>
  );
}
function Sidebar() {
  const { user, setUser } = useContext(Context),
    navigate = useNavigate();
  return (
    <aside className="sidebar">
      <Link to="/" className="brand">
        <span className="brand-mark">
          <Icon name="tool" />
        </span>
        repairloop<span className="brand-period">.</span>
      </Link>
      <div className="workspace-label">YOUR REPAIR STUDIO</div>
      <nav>
        <NavLink to="/" end>
          <Icon name="grid" />
          Overview
        </NavLink>
        <NavLink to="/dashboard">
          <Icon name="tool" />
          My repairs
        </NavLink>
        <NavLink to="/assistant">
          <Icon name="spark" />
          Repair assistant<span className="tiny-tag">AI</span>
        </NavLink>
        <NavLink to="/knowledge">
          <Icon name="leaf" />
          Care guides
        </NavLink>
        {user && user.role !== "CUSTOMER" && (
          <NavLink to="/staff">
            <Icon name="laptop" />
            Technician desk
          </NavLink>
        )}
        <NavLink to="/lab">
          <Icon name="bolt" />
          Learning lab
        </NavLink>
      </nav>
      <div className="sidebar-note">
        <Icon name="leaf" />
        <h4>
          A little repair.
          <br />A longer story.
        </h4>
        <p>Keep the devices you love in your life for longer.</p>
      </div>
      <div className="profile">
        {user ? (
          <>
            <span className="avatar">{user.name[0]}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.role.toLowerCase()}</small>
            </div>
            <button
              className="text-button"
              onClick={async () => {
                await send("/auth/logout", {});
                setUser(null);
                navigate("/");
              }}
            >
              Exit
            </button>
          </>
        ) : (
          <Link className="button secondary" to="/login">
            Sign in <Icon name="arrow" size={18} />
          </Link>
        )}
      </div>
    </aside>
  );
}
function Home() {
  const { services } = useContext(Context);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">LESS WASTE. MORE POSSIBILITY.</div>
          <h1>Let’s give it a second life.</h1>
          <p>
            A cracked screen. A tired battery. A laptop that’s lost its spark.
            <br className="desktop-break" /> We’ll help you find a way forward.
          </p>
        </div>
        <Link className="button secondary" to="/dashboard">
          Track a repair <Icon name="arrow" size={17} />
        </Link>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="pill">
            <span className="online-dot" /> YOUR NEXT CHAPTER STARTS HERE
          </span>
          <h2>
            Good devices.
            <br />
            Great comebacks.
          </h2>
          <p>
            Book a repair, follow every step, and get back
            <br className="desktop-break" /> to the things that matter.
          </p>
          <Link to="/dashboard" className="button dark">
            Book your repair <Icon name="arrow" size={18} />
          </Link>
          <div className="hero-foot">
            <Icon name="check" size={16} /> Clear pricing <span>·</span>
            <Icon name="check" size={16} /> Updates at every step
          </div>
        </div>
        <div
          className="hero-art"
          aria-label="Illustration of a repaired phone surrounded by circular arrows"
        >
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit-dot" />
          <div className="phone">
            <div className="phone-camera" />
            <div className="phone-screen">
              <span className="phone-leaf">
                <Icon name="leaf" size={60} />
              </span>
              <b>back to life.</b>
              <span>100% possibility</span>
              <div className="battery">
                <i />
              </div>
            </div>
          </div>
          <span className="floating-label">
            <span className="check-circle">
              <Icon name="check" size={17} />
            </span>{" "}
            Made for another chapter
          </span>
          <span className="floating-spark">✳</span>
        </div>
      </section>
      <div className="trust-row">
        <div>
          <Icon name="tool" />
          <span>
            <strong>Repair with confidence</strong>
            <small>A clear plan before we begin</small>
          </span>
        </div>
        <div>
          <Icon name="clock" />
          <span>
            <strong>Stay in the loop</strong>
            <small>Follow your repair in real time</small>
          </span>
        </div>
        <div>
          <Icon name="leaf" />
          <span>
            <strong>Choose a longer life</strong>
            <small>Repair is a good place to start</small>
          </span>
        </div>
      </div>
      <section>
        <div className="section-heading">
          <div>
            <div className="eyebrow">A FRESH START FOR YOUR DEVICE</div>
            <h2>What needs a little care?</h2>
          </div>
          <Link to="/dashboard" className="text-link">
            Explore repairs <Icon name="arrow" size={16} />
          </Link>
        </div>
        <div className="service-grid">
          {services.map((s, i) => (
            <ServiceCard key={s.id} service={s} index={i} />
          ))}
        </div>
      </section>
      <section className="assistant-callout">
        <span className="assistant-icon">
          <Icon name="spark" size={28} />
        </span>
        <div>
          <h3>Not sure where to start?</h3>
          <p>
            Tell our repair assistant what’s happening. We’ll help you take the
            next step.
          </p>
        </div>
        <Link to="/assistant" className="button secondary">
          Let’s figure it out <Icon name="arrow" size={17} />
        </Link>
      </section>
    </>
  );
}
function ServiceCard({ service: s, index }) {
  return (
    <Link className="service-card" to={`/dashboard?service=${s.id}`}>
      <div className={`service-icon tone-${index}`}>
        <Icon
          name={
            s.category === "Computer"
              ? "laptop"
              : s.id === "diagnosis"
                ? "tool"
                : s.id === "battery"
                  ? "bolt"
                  : "phone"
          }
          size={30}
        />
      </div>
      <span className="category">{s.category}</span>
      <h3>{s.name}</h3>
      <p>{s.description}</p>
      <div className="service-bottom">
        <span>
          <small>Booking fee</small>
          <strong>{money(s.pricePaise)}</strong>
        </span>
        <span className="circle-arrow">
          <Icon name="arrow" size={20} />
        </span>
      </div>
    </Link>
  );
}
function Gate({ children, staff = false }) {
  const { user, ready } = useContext(Context);
  if (!ready) return <p className="loading">Loading your workspace…</p>;
  if (!user)
    return (
      <Empty title="Your repair story starts here">
        Sign in to book a repair and keep everything in one place.
        <br />
        <Link className="button dark" to="/login">
          Sign in or create account
        </Link>
      </Empty>
    );
  if (staff && user.role === "CUSTOMER")
    return (
      <Empty title="Technician access required">
        This workspace is for repair staff.
      </Empty>
    );
  return children;
}
// Controlled fields keep one source of truth; client constraints complement server validation.
function Login() {
  const { setUser, config } = useContext(Context),
    navigate = useNavigate();
  const [register, setRegister] = useState(false),
    [form, setForm] = useState({ name: "", email: "", password: "" }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = register
        ? form
        : { email: form.email, password: form.password };
      setUser(await send(`/auth/${register ? "register" : "login"}`, payload));
      navigate("/dashboard");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-card">
      <div className="eyebrow">WELCOME TO REPAIRLOOP</div>
      <h1>
        {register ? "Start a better repair story." : "Good to see you again."}
      </h1>
      <p>Your devices, updates, and next steps in one place.</p>
      <form onSubmit={submit}>
        {register && (
          <Field
            label="Your name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            minLength={2}
            autoComplete="name"
          />
        )}
        <Field
          label="Email address"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          autoComplete="email"
        />
        <Field
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          minLength={register ? 12 : 1}
          required
          autoComplete={register ? "new-password" : "current-password"}
        />
        <Notice>{error}</Notice>
        <Button className="button dark full" busy={busy}>
          {register ? "Create account" : "Sign in"}{" "}
          <Icon name="arrow" size={18} />
        </Button>
      </form>
      {config.googleEnabled && (
        <a className="button secondary full" href="/api/auth/google">
          Continue with Google
        </a>
      )}
      <button
        className="text-button"
        onClick={() => {
          setRegister(!register);
          setError("");
        }}
      >
        {register
          ? "Already have an account? Sign in"
          : "New here? Create an account"}
      </button>
      {config.mode === "demo" && (
        <div className="demo-credentials">
          <strong>Try the demo</strong>
          <p>
            Password: <code>RepairLoopDemo123!</code>
          </p>
          <button
            onClick={() =>
              setForm({
                ...form,
                email: "alex@repairloop.local",
                password: "RepairLoopDemo123!",
              })
            }
          >
            Fill customer login
          </button>
          <button
            onClick={() =>
              setForm({
                ...form,
                email: "admin@repairloop.local",
                password: "RepairLoopDemo123!",
              })
            }
          >
            Fill technician login
          </button>
        </div>
      )}
    </div>
  );
}
function Dashboard() {
  return (
    <Gate>
      <Repairs />
    </Gate>
  );
}
// Booking mutations are followed by a source-of-truth refetch, also triggered by socket events.
function Repairs() {
  const { services, user, config } = useContext(Context);
  const [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [connected, setConnected] = useState(false),
    [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    serviceId: services[0]?.id || "",
    device: "",
    issue: "",
  });
  async function refresh() {
    try {
      const data = await api("/bookings");
      setRows(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get(
      "service",
    );
    if (services.some((s) => s.id === requested))
      setForm((f) => ({ ...f, serviceId: requested }));
    refresh();
    const socket = io({ withCredentials: true });
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("booking:updated", refresh);
    return () => socket.disconnect();
  }, [user.id]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const booking = await send("/bookings", form);
      await refresh();
      setSelected(booking.id);
      setForm({ ...form, device: "", issue: "" });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function pay(b) {
    setBusy(true);
    setError("");
    try {
      const order = await send(`/bookings/${b.id}/payment-order`, {});
      if (order.demo) {
        await send(`/bookings/${b.id}/demo-payment`, {});
        await refresh();
        return;
      }
      await loadCheckout();
      await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: order.keyId,
          order_id: order.providerOrderId,
          amount: order.amountPaise,
          currency: "INR",
          name: "RepairLoop",
          description: b.service.name,
          handler: async (result) => {
            try {
              await send(`/bookings/${b.id}/payment-verify`, result);
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          modal: { ondismiss: () => resolve() },
        });
        checkout.on("payment.failed", () =>
          reject(
            new Error(
              "Payment failed. No successful payment has been recorded.",
            ),
          ),
        );
        checkout.open();
      });
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(b, file) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (file.size > 3 * 1024 * 1024)
        throw new Error("Choose a photo smaller than 3 MB");
      const data = new FormData();
      data.append("photo", file);
      await api(`/bookings/${b.id}/attachments`, {
        method: "POST",
        body: data,
      });
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR DEVICES, IN GOOD HANDS</div>
          <h1>My repairs</h1>
          <p>One place for every step of your device’s comeback.</p>
        </div>
        <span className="pill">
          <span className={connected ? "online-dot" : "offline-dot"} />
          {connected ? "Live updates connected" : "Connecting live updates"}
        </span>
      </div>
      <Notice>{error}</Notice>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>Repair timeline</h2>
            <span className="count">{rows.length}</span>
          </div>
          {loading ? (
            <p className="loading">Loading repairs…</p>
          ) : !rows.length ? (
            <Empty title="A fresh start is one booking away">
              Your repair requests will appear here.
            </Empty>
          ) : (
            rows.map((b) => (
              <article className="booking" key={b.id}>
                <button
                  className="booking-summary"
                  onClick={() => setSelected(selected === b.id ? null : b.id)}
                >
                  <span className="service-icon tone-0">
                    <Icon name="phone" />
                  </span>
                  <span>
                    <strong>{b.device}</strong>
                    <small>
                      {b.service.name} · {date(b.createdAt)}
                    </small>
                  </span>
                  <span className={`status status-${b.status}`}>
                    {b.status.replaceAll("_", " ")}
                  </span>
                </button>
                {selected === b.id && (
                  <div className="booking-detail">
                    <p>{b.issue}</p>
                    <ol className="timeline">
                      {b.events.map((e) => (
                        <li key={e.id}>
                          <strong>{e.kind.replaceAll("_", " ")}</strong>
                          <p>{e.message}</p>
                        </li>
                      ))}
                    </ol>
                    <div className="payment-row">
                      <strong>{money(b.amountPaise)}</strong>
                      {b.payment?.status === "PAID" ? (
                        <span className="paid">
                          <Icon name="check" size={16} />{" "}
                          {config.mode === "demo"
                            ? "Demo paid"
                            : "Payment verified"}
                        </span>
                      ) : (
                        <Button
                          className="button dark"
                          busy={busy}
                          disabled={b.status === "CANCELLED"}
                          onClick={() => pay(b)}
                        >
                          {config.mode === "demo"
                            ? "Simulate payment"
                            : "Pay securely"}
                        </Button>
                      )}
                    </div>
                    <label className="upload-label">
                      Add a device photo (PNG/JPEG, max 3 MB)
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        disabled={busy}
                        onChange={(e) => {
                          upload(b, e.target.files[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <div className="attachments">
                      {b.attachments.map((f) => (
                        <a
                          key={f.id}
                          href={`/api/attachments/${f.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={`/api/attachments/${f.id}`}
                            alt="Uploaded device photo"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))
          )}
        </section>
        <section className="panel booking-form">
          <span className="eyebrow">LET’S GET STARTED</span>
          <h2>Book a repair</h2>
          <p>Tell us a little about your device.</p>
          <form onSubmit={submit}>
            <label className="field">
              <span>Service</span>
              <select
                value={form.serviceId}
                onChange={(e) =>
                  setForm({ ...form, serviceId: e.target.value })
                }
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {money(s.pricePaise)}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Device name"
              placeholder="e.g. OnePlus 11, Dell Inspiron"
              value={form.device}
              onChange={(e) => setForm({ ...form, device: e.target.value })}
              required
              minLength={2}
              maxLength={120}
            />
            <Field
              label="What’s happening?"
              placeholder="Describe the issue and when it started…"
              rows={5}
              value={form.issue}
              onChange={(e) => setForm({ ...form, issue: e.target.value })}
              required
              minLength={10}
              maxLength={2000}
            />
            <Button className="button dark full" busy={busy}>
              Create repair request <Icon name="arrow" size={17} />
            </Button>
            <small className="form-note">
              You can review and pay after creating your request.
            </small>
          </form>
        </section>
      </div>
    </>
  );
}
function Assistant() {
  return (
    <Gate>
      <AssistantForm />
    </Gate>
  );
}
// Streaming text is shown as inert text; the completed, validated result becomes the advice card.
function AssistantForm() {
  const [question, setQuestion] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState(null),
    [partial, setPartial] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    setPartial("");
    try {
      await streamAdvice(question, (type, data) => {
        if (type === "delta") setPartial((t) => t + data.text);
        if (type === "result") setResult(data);
        if (type === "error") setError(data.message);
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">A LITTLE GUIDANCE GOES A LONG WAY</div>
          <h1>Let’s figure it out.</h1>
          <p>Describe what’s happening. Get a clearer next step.</p>
        </div>
        <span className="assistant-icon">
          <Icon name="spark" size={30} />
        </span>
      </div>
      <div className="assistant-layout">
        <section className="panel">
          <h2>What’s on your mind?</h2>
          <form onSubmit={submit}>
            <Field
              label="Your device issue"
              rows={6}
              placeholder="My laptop is running slowly and getting warm…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              minLength={5}
              maxLength={2000}
            />
            <div className="suggestions">
              {[
                "My battery looks swollen",
                "How do I book a repair?",
                "My laptop is running slowly",
              ].map((s) => (
                <button type="button" key={s} onClick={() => setQuestion(s)}>
                  {s}
                </button>
              ))}
            </div>
            <Button className="button dark" busy={busy}>
              Find my next step <Icon name="spark" size={17} />
            </Button>
          </form>
          <Notice>{error}</Notice>
        </section>
        <section className="panel advice" aria-live="polite">
          {result ? (
            <>
              <span className="pill">
                {result.mode === "demo"
                  ? "Local demo response"
                  : "AI-assisted guidance"}
              </span>
              <h2>Your next steps</h2>
              <p>{result.advice.summary}</p>
              <ol>
                {result.advice.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              <p className="muted">
                {result.advice.urgency === "professional"
                  ? "Professional inspection recommended"
                  : "Start with these simple checks"}
              </p>
              {result.advice.sources.length > 0 && (
                <p>Sources: {result.advice.sources.join(", ")}</p>
              )}
              <Link className="button secondary" to="/dashboard">
                Book a diagnosis <Icon name="arrow" size={16} />
              </Link>
              <details>
                <summary>How this response was made</summary>
                <p>
                  Tools:{" "}
                  {result.toolCalls.join(" → ") ||
                    "None (demo or direct response)"}
                </p>
                <pre>{JSON.stringify(result.usage, null, 2)}</pre>
              </details>
            </>
          ) : busy ? (
            <>
              <h2>Thinking through the next step…</h2>
              <pre className="stream-preview">
                {partial || "Retrieving guidance and checking context…"}
              </pre>
            </>
          ) : (
            <Empty title="Clarity, before the repair">
              Your guidance will appear here. This assistant supports repair
              intake; a technician confirms the diagnosis.
            </Empty>
          )}
        </section>
      </div>
    </>
  );
}
// One form supports create and edit, while server role checks enforce the staff-only boundary.
function Knowledge() {
  const { user } = useContext(Context),
    [rows, setRows] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [editing, setEditing] = useState(null),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState({ title: "", text: "", tags: "care" });
  const staff = user && user.role !== "CUSTOMER";
  async function refresh() {
    try {
      setRows(await api("/knowledge"));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = {
        ...form,
        tags: form.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      await send(
        editing ? `/knowledge/${editing}` : "/knowledge",
        data,
        editing ? "PUT" : "POST",
      );
      setForm({ title: "", text: "", tags: "care" });
      setEditing(null);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SMALL HABITS. LONGER DEVICE LIFE.</div>
          <h1>A little care goes a long way.</h1>
          <p>Practical guides from the repair studio.</p>
        </div>
      </div>
      <Notice>{error}</Notice>
      {loading ? (
        <p className="loading">Loading care guides…</p>
      ) : (
        <div className="guide-grid">
          {rows.map((r) => (
            <article className="panel" key={r._id}>
              <Icon name="leaf" />
              <div className="tags">
                {r.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <h2>{r.title}</h2>
              <p>{r.text}</p>
              {staff && (
                <div className="row-actions">
                  <button
                    onClick={() => {
                      setEditing(r._id);
                      setForm({
                        title: r.title,
                        text: r.text,
                        tags: r.tags.join(", "),
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm("Delete this care guide?"))
                        try {
                          await api(`/knowledge/${r._id}`, {
                            method: "DELETE",
                          });
                          await refresh();
                        } catch (e) {
                          setError(e.message);
                        }
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {staff && (
        <section className="panel article-form">
          <h2>{editing ? "Edit guide" : "Write a care guide"}</h2>
          <form onSubmit={save}>
            <Field
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              minLength={3}
              maxLength={120}
            />
            <Field
              label="Guidance"
              rows={5}
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              required
              minLength={20}
              maxLength={6000}
            />
            <Field
              label="Tags (comma separated)"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
            <Button className="button dark" busy={busy}>
              Save guide
            </Button>
            {editing && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setEditing(null);
                  setForm({ title: "", text: "", tags: "care" });
                }}
              >
                Cancel edit
              </button>
            )}
          </form>
          <p className="muted">
            Editing clears the old vector. Run the indexing command before using
            updated guides in live AI retrieval.
          </p>
        </section>
      )}
    </>
  );
}
function Staff() {
  return (
    <Gate staff>
      <StaffDesk />
    </Gate>
  );
}
// Parallel reads load independent reports and bookings. Status mutations remain sequential.
function StaffDesk() {
  const [rows, setRows] = useState([]),
    [report, setReport] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function refresh() {
    try {
      const [b, r] = await Promise.all([api("/bookings"), api("/reports")]);
      setRows(b);
      setReport(r);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    refresh();
    const socket = io();
    socket.on("booking:updated", refresh);
    return () => socket.disconnect();
  }, []);
  const transitions = {
    REQUESTED: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["IN_REPAIR", "CANCELLED"],
    IN_REPAIR: ["READY"],
    READY: ["COLLECTED"],
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE REPAIR STUDIO</div>
          <h1>Technician desk</h1>
          <p>Keep every repair moving, and every customer in the loop.</p>
        </div>
      </div>
      <Notice>{error}</Notice>
      <div className="metrics">
        {report?.services.map((r) => (
          <div className="panel metric" key={r.name}>
            <span>{r.name}</span>
            <strong>{r.bookings}</strong>
            <small>{money(r.paidPaise)} paid</small>
          </div>
        ))}
      </div>
      <section className="panel">
        <h2>Repair queue</h2>
        {!rows.length ? (
          <Empty title="The queue is clear">
            New repair requests will appear here.
          </Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Next step</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.device}</strong>
                      <small>{b.issue}</small>
                    </td>
                    <td>{b.service.name}</td>
                    <td>
                      <span className="status">
                        {b.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        {transitions[b.status]?.map((s) => (
                          <Button
                            key={s}
                            busy={busy}
                            onClick={async () => {
                              setBusy(true);
                              setError("");
                              try {
                                await send(
                                  `/bookings/${b.id}/status`,
                                  { status: s },
                                  "PATCH",
                                );
                                await refresh();
                              } catch (e) {
                                setError(e.message);
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            {s.replaceAll("_", " ")}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <div className="guide-grid report-grid">
        <section className="panel">
          <h2>Knowledge topics</h2>
          {report?.tags.map((t) => (
            <p key={t._id}>
              {t._id} <strong>{t.articles} guides</strong>
            </p>
          ))}
        </section>
        <section className="panel">
          <h2>AI usage</h2>
          <p>
            Token counts and estimated cost are recorded per provider request.
            Unconfigured pricing is unknown, not free.
          </p>
          <pre>{JSON.stringify(report?.aiUsage || [], null, 2)}</pre>
        </section>
      </div>
    </>
  );
}
function Lab() {
  const [logs, setLogs] = useState([]),
    [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    const counter = makeCounter();
    const promiseResult = await callbackToPromise((done) =>
      setTimeout(
        () => done(null, "Callback converted to a Promise, then awaited."),
        0,
      ),
    );
    setLogs([
      ...(await eventLoopDemo()),
      ...hoistingDemo(),
      `Closure counter: ${counter()}, ${counter()}, ${counter()}`,
      promiseResult,
    ]);
    setBusy(false);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">UNDER THE HOOD</div>
          <h1>Learn it. Run it. Explain it.</h1>
          <p>
            Small, executable examples of the JavaScript behind this
            application.
          </p>
        </div>
      </div>
      <section className="panel lab">
        <h2>The JavaScript runtime</h2>
        <p>
          Predict the output first: synchronous code runs before Promise
          microtasks, and timers run afterward. Function declarations are
          hoisted; <code>let</code> stays inaccessible in its temporal dead zone
          until initialization.
        </p>
        <Button className="button dark" busy={busy} onClick={run}>
          Run the examples <Icon name="bolt" size={18} />
        </Button>
        <pre aria-live="polite">
          {logs.length
            ? logs.join("\n")
            : "Press Run to inspect the execution order."}
        </pre>
        <h3>Find the implementation</h3>
        <p>
          <code>client/js-lab.js</code> contains the examples.{" "}
          <code>client/api.js</code> uses a closure to reuse the checkout-loader
          Promise. <code>client/App.jsx</code> uses effects to subscribe to
          real-time events and disconnect on unmount.
        </p>
      </section>
    </>
  );
}
