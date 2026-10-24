import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  ArrowLeftRight,
  LayoutDashboard,
  Wallet,
  ShieldCheck,
  History,
  LogOut,
  Menu,
  X,
  Check,
  ChevronRight,
  RefreshCw,
  Search,
  Landmark,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { api, ApiError, post, refreshCsrf } from "./api";
import {
  TransferAttempt,
  validateTransfer,
  normalizedInput,
  formatMoney,
} from "./transfer";
import type {
  User,
  Account,
  Dashboard,
  Transfer,
  Transaction,
  Beneficiary,
  Audit,
  TransferInput,
} from "./types";
const money = formatMoney;
const date = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
const statusText = {
  COMPLETED: "Tamamlandı",
  PENDING_APPROVAL: "Onay bekliyor",
  REJECTED: "Reddedildi",
};
const message = (e: unknown) =>
  e instanceof Error ? e.message : "Beklenmeyen bir sorun oluştu.";
function Status({ status }: { status: Transfer["status"] }) {
  return (
    <span className={"badge " + status.toLowerCase()}>
      <span />
      {statusText[status]}
    </span>
  );
}
function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div className="notice error" role="alert">
      <AlertCircle size={19} />
      <div>{children}</div>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <History size={30} />
      <h3>Henüz bir kayıt yok</h3>
      <p>{text}</p>
    </div>
  );
}
function Login({
  onLogin,
  expired,
}: {
  onLogin: (user: User) => void;
  expired: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [visible, setVisible] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await refreshCsrf();
      const user = await api<User>("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username: String(form.get("username")),
          password: String(form.get("password")),
        }),
      });
      await refreshCsrf();
      onLogin(user);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <section className="login-story">
        <a className="brand" href="/">
          <span className="brand-symbol">
            <ArrowLeftRight />
          </span>
          bankflow<span className="brand-dot">.</span>
        </a>
        <div>
          <span className="eyebrow light">
            PARANIZIN AKIŞI, SİZİN KONTROLÜNÜZDE
          </span>
          <h1>
            Her işlemde{" "}
            <br />
            bir adım önde.
          </h1>
          <p>
            Hesaplarınızı tek yerde görün.{" "}
            <br />
            Transferlerinizi güvenle yönetin.
          </p>
          <div className="flow-visual">
            <div className="orbit one" />
            <div className="orbit two" />
            <div className="flow-center">
              <ArrowLeftRight size={42} />
            </div>
            <span className="flow-label">
              <CheckCircle2 size={17} /> Kontrol sizde
            </span>
          </div>
        </div>
        <small>BankFlow · Demo ortamı · Sanal TL</small>
      </section>
      <section className="login-form-side">
        <div className="login-form">
          <span className="eyebrow">BANKFLOW'A HOŞ GELDİNİZ</span>
          <h2>Tekrar merhaba.</h2>
          <p className="muted">Hesaplarınıza ulaşmak için giriş yapın.</p>
          {expired && (
            <div className="notice">
              Oturumunuz sona erdi. Devam etmek için yeniden giriş yapın.
            </div>
          )}
          {error && <ErrorBox>{error}</ErrorBox>}
          <form onSubmit={submit}>
            <label>
              Kullanıcı adı
              <input
                name="username"
                autoComplete="username"
                required
                autoFocus
                placeholder="Kullanıcı adınız"
              />
            </label>
            <label>
              Şifre
              <div className="password-input">
                <input
                  name="password"
                  type={visible ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="Şifrenizi girin"
                />
                <button
                  type="button"
                  onClick={() => setVisible(!visible)}
                  aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
                >
                  {visible ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </label>
            <button className="button primary wide" disabled={busy}>
              {busy ? "Giriş yapılıyor…" : "Giriş yap"}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="login-note">
            <ShieldCheck size={21} />
            <p>
              Bu bir demo ortamıdır. İşlemler yalnızca sanal TL ile, BankFlow
              demo hesapları arasında gerçekleşir.
            </p>
          </div>
        </div>
        <small className="login-footer">
          Daha sade bir bankacılık deneyimi.
        </small>
      </section>
    </main>
  );
}
type Page =
  | "dashboard"
  | "accounts"
  | "transfer"
  | "history"
  | "operations"
  | "audit";
const titles: Record<Page, string> = {
  dashboard: "Genel bakış",
  accounts: "Hesaplarım",
  transfer: "Para transferi",
  history: "Transfer geçmişi",
  operations: "İşlem onayları",
  audit: "Denetim kayıtları",
};
export default function App() {
  const [user, setUser] = useState<User | null>(null),
    [initial, setInitial] = useState(true),
    [expired, setExpired] = useState(false),
    [startupError, setStartupError] = useState("");
  useEffect(() => {
    api<User>("/auth/me")
      .then(setUser)
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401))
          setStartupError(message(e));
      })
      .finally(() => setInitial(false));
    const expire = () => {
      setUser(null);
      setExpired(true);
    };
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, []);
  if (initial)
    return (
      <div className="boot">
        <span className="brand-symbol">
          <ArrowLeftRight />
        </span>
        <p>BankFlow hazırlanıyor…</p>
      </div>
    );
  if (!user)
    return (
      <>
        {startupError && (
          <div className="startup-error">
            <ErrorBox>{startupError}</ErrorBox>
          </div>
        )}
        <Login
          expired={expired}
          onLogin={(u) => {
            setExpired(false);
            setStartupError("");
            setUser(u);
          }}
        />
      </>
    );
  return (
    <Bank
      key={user.id}
      user={user}
      onLogout={() => {
        setExpired(false);
        setUser(null);
      }}
    />
  );
}
function Bank({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [page, setPage] = useState<Page>("dashboard"),
    [menu, setMenu] = useState(false),
    [accounts, setAccounts] = useState<Account[]>([]),
    [dashboard, setDashboard] = useState<Dashboard | null>(null),
    [transfers, setTransfers] = useState<Transfer[]>([]),
    [operations, setOperations] = useState<Transfer[]>([]),
    [audit, setAudit] = useState<Audit[]>([]),
    [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [detail, setDetail] = useState<Transfer | null>(null),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState("");
  const operator = user.roles.some(
    (r) => r === "OPERATOR" || r === "ROLE_OPERATOR",
  );
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [a, d, t, b] = await Promise.all([
        api<Account[]>("/accounts"),
        api<Dashboard>("/dashboard"),
        api<Transfer[]>("/transfers"),
        api<Beneficiary[]>("/beneficiaries"),
      ]);
      setAccounts(a);
      setDashboard(d);
      setTransfers(t);
      setBeneficiaries(b);
      if (operator) {
        const [o, l] = await Promise.all([
          api<Transfer[]>("/operations/transfers"),
          api<Audit[]>("/operations/audit"),
        ]);
        setOperations(o);
        setAudit(l);
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }, [operator]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  const navigate = (next: Page) => {
    setPage(next);
    setMenu(false);
    setError("");
  };
  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await post("/auth/logout", {});
      onLogout();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const items: { page: Page; icon: typeof Wallet; label: string }[] = [
    { page: "dashboard", icon: LayoutDashboard, label: "Genel bakış" },
    { page: "accounts", icon: Wallet, label: "Hesaplarım" },
    { page: "transfer", icon: ArrowLeftRight, label: "Para transferi" },
    { page: "history", icon: History, label: "Transfer geçmişi" },
  ];
  return (
    <div className="app-shell">
      {menu && (
        <button
          className="sidebar-overlay"
          aria-label="Menüyü kapat"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("dashboard");
          }}
          className="brand"
        >
          <span className="brand-symbol">
            <ArrowLeftRight />
          </span>
          bankflow<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">KİŞİSEL BANKACILIK</div>
        <nav aria-label="Ana menü">
          {items.map(({ page: p, icon: Icon, label }) => (
            <button
              key={p}
              className={"nav-item " + (page === p ? "active" : "")}
              onClick={() => navigate(p)}
            >
              <Icon size={20} />
              {label}
              {p === page && <ChevronRight className="nav-chevron" size={15} />}
            </button>
          ))}
          {operator && (
            <>
              <div className="workspace-label operations-label">
                OPERASYON MERKEZİ
              </div>
              <button
                className={
                  "nav-item " + (page === "operations" ? "active" : "")
                }
                onClick={() => navigate("operations")}
              >
                <ShieldCheck size={20} />
                İşlem onayları
                {operations.filter((t) => t.status === "PENDING_APPROVAL")
                  .length > 0 && (
                  <span className="nav-count">
                    {
                      operations.filter((t) => t.status === "PENDING_APPROVAL")
                        .length
                    }
                  </span>
                )}
              </button>
              <button
                className={"nav-item " + (page === "audit" ? "active" : "")}
                onClick={() => navigate("audit")}
              >
                <History size={20} />
                Denetim kayıtları
              </button>
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-note">
            <span className="live-dot" />
            Demo ortamı · Sanal TL
          </div>
          <div className="user-card">
            <span className="avatar">
              {user.fullName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <strong>{user.fullName}</strong>
              <small>
                {operator ? "Müşteri ve operasyon" : "Bireysel müşteri"}
              </small>
            </div>
            <button
              aria-label="Çıkış yap"
              title="Çıkış yap"
              onClick={logout}
              disabled={busy}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            onClick={() => setMenu(true)}
            aria-label="Menüyü aç"
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            BankFlow <ChevronRight size={14} />
            <strong>{titles[page]}</strong>
          </div>
          <div className="topbar-right">
            <span className="secure">
              <ShieldCheck size={15} />
              Güvenli oturum
            </span>
            <button
              className="icon-button"
              onClick={() => void load()}
              disabled={loading}
              title="Verileri yenile"
              aria-label="Verileri yenile"
            >
              <RefreshCw size={17} className={loading ? "spin" : ""} />
            </button>
          </div>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {page === "operations" || page === "audit"
                  ? "OPERASYON MERKEZİ"
                  : "KİŞİSEL BANKACILIK"}
              </span>
              <h1>
                {page === "dashboard"
                  ? `Merhaba, ${user.fullName.split(" ")[0]}.`
                  : titles[page]}
              </h1>
              <p>
                {page === "dashboard"
                  ? "Bugün finansal akışınız nasıl görünüyor?"
                  : (
                      {
                        accounts: "Tüm hesaplarınız, tek bir yerde.",
                        transfer:
                          "BankFlow hesapları arasında kolayca transfer yapın.",
                        history: "Transferlerinizin her adımını takip edin.",
                        operations:
                          "Bekleyen talepleri inceleyin ve karara bağlayın.",
                        audit: "Gerçekleşen işlemleri ve kararları izleyin.",
                      } as Partial<Record<Page, string>>
                    )[page]}
              </p>
            </div>
            {page === "dashboard" && (
              <button
                className="button primary"
                onClick={() => navigate("transfer")}
              >
                <ArrowUpRight size={18} />
                Yeni transfer
              </button>
            )}
          </div>
          {error && (
            <ErrorBox>
              {error}
              <button className="text-button" onClick={() => void load()}>
                Yeniden dene
              </button>
            </ErrorBox>
          )}
          {loading && !dashboard ? (
            <div className="loading-panel" role="status">
              <RefreshCw size={25} className="spin" />
              <p>Hesap bilgileriniz yükleniyor…</p>
            </div>
          ) : (
            <>
              {page === "dashboard" && dashboard && (
                <>
                  <section className="overview-grid">
                    <div className="balance-card">
                      <div className="balance-card-head">
                        <span>Toplam bakiyeniz</span>
                        <span className="mini-mark">
                          <Landmark size={20} />
                        </span>
                      </div>
                      <strong className="total-balance">
                        {money(dashboard.totalBalance)}
                      </strong>
                      <div className="balance-bottom">
                        <span>
                          <span className="live-dot" />
                          {dashboard.accountCount} aktif hesap
                        </span>
                        <span>Sanal Türk lirası</span>
                      </div>
                      <div className="balance-rings" />
                    </div>
                    <Metric
                      label="Gelen transferler"
                      value={money(dashboard.incomingTotal)}
                      incoming
                    />
                    <Metric
                      label="Giden transferler"
                      value={money(dashboard.outgoingTotal)}
                    />
                  </section>
                  <div className="dashboard-middle">
                    <section className="panel">
                      <div className="section-title">
                        <div>
                          <h2>Hesaplarım</h2>
                          <p>Hareketlerinize hızlıca ulaşın</p>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => navigate("accounts")}
                        >
                          Tüm hesaplar
                          <ArrowRight size={15} />
                        </button>
                      </div>
                      <div className="compact-accounts">
                        {accounts.length ? (
                          accounts.slice(0, 3).map((a) => (
                            <button
                              key={a.id}
                              onClick={() => navigate("accounts")}
                              className="compact-account"
                            >
                              <span className="account-icon">
                                <Wallet size={22} />
                              </span>
                              <div>
                                <strong>{a.name}</strong>
                                <small>{a.accountNumber}</small>
                              </div>
                              <b>{money(a.balance)}</b>
                              <ChevronRight size={16} />
                            </button>
                          ))
                        ) : (
                          <Empty text="Kullanıcınıza bağlı hesap bulunmuyor." />
                        )}
                      </div>
                    </section>
                    <section className="insight-card">
                      <div className="insight-icon">
                        <ShieldCheck size={27} />
                      </div>
                      <h2>Kontrol her adımda.</h2>
                      <p>
                        10.000 TL ve üzeri transferler, operasyon onayıyla
                        tamamlanır.
                      </p>
                      <div className="pending-summary">
                        <span>Onay bekleyen transfer</span>
                        <strong>{dashboard.pendingCount}</strong>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => navigate("history")}
                      >
                        Transferlerimi incele
                        <ArrowRight size={16} />
                      </button>
                    </section>
                  </div>
                  <section className="panel">
                    <div className="section-title">
                      <div>
                        <h2>Son transferler</h2>
                        <p>Hesaplarınızdaki son hareketler</p>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => navigate("history")}
                      >
                        Tümünü gör
                        <ArrowRight size={15} />
                      </button>
                    </div>
                    <TransferTable
                      transfers={dashboard.recentTransfers}
                      onDetail={setDetail}
                    />
                  </section>
                </>
              )}
              {page === "accounts" && <Accounts accounts={accounts} />}
              {page === "transfer" && (
                <TransferForm
                  accounts={accounts}
                  beneficiaries={beneficiaries}
                  onDone={async (result) => {
                    setToast(
                      result.status === "PENDING_APPROVAL"
                        ? "Transfer talebiniz onaya gönderildi."
                        : "Transferiniz tamamlandı.",
                    );
                    await load();
                  }}
                />
              )}
              {page === "history" && (
                <HistoryPage transfers={transfers} onDetail={setDetail} />
              )}
              {page === "operations" && operator && (
                <HistoryPage
                  transfers={operations}
                  onDetail={setDetail}
                  operations
                />
              )}
              {page === "audit" && operator && (
                <section className="panel">
                  <div className="section-title">
                    <div>
                      <h2>İşlem günlüğü</h2>
                      <p>{audit.length} kayıt</p>
                    </div>
                    <History size={22} />
                  </div>
                  {audit.length ? (
                    <div className="audit-list">
                      {audit.map((item) => (
                        <div className="audit-row" key={item.id}>
                          <span className="audit-dot">
                            <Check size={16} />
                          </span>
                          <div>
                            <strong>{eventLabel(item.eventType)}</strong>
                            <p>{item.details}</p>
                            <small>
                              {item.actorName} · {item.reference || "—"}
                            </small>
                          </div>
                          <time>{date(item.createdAt)}</time>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty text="Denetim kayıtları burada görünecek." />
                  )}
                </section>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>© {new Date().getFullYear()} BankFlow</span>
            <span>
              Demo hesap numaraları kullanılır · Gerçek para işlemi yapılmaz
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={20} />
          {toast}
          <button aria-label="Bildirimi kapat" onClick={() => setToast("")}>
            <X size={17} />
          </button>
        </div>
      )}
      {detail && (
        <TransferDetail
          transfer={detail}
          user={user}
          operator={operator && page === "operations"}
          onClose={() => setDetail(null)}
          onDecision={async () => {
            setDetail(null);
            setToast("Transfer kararı kaydedildi.");
            await load();
          }}
        />
      )}
    </div>
  );
}
function Metric({
  label,
  value,
  incoming = false,
}: {
  label: string;
  value: string;
  incoming?: boolean;
}) {
  return (
    <div className="metric">
      <span className={"metric-icon " + (incoming ? "incoming" : "outgoing")}>
        {incoming ? <ArrowDownLeft size={23} /> : <ArrowUpRight size={23} />}
      </span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>Tüm tamamlanan işlemler</small>
    </div>
  );
}
function TransferTable({
  transfers,
  onDetail,
}: {
  transfers: Transfer[];
  onDetail: (t: Transfer) => void;
}) {
  return transfers.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Gönderen / alıcı</th>
            <th>Tarih</th>
            <th>Durum</th>
            <th className="align-right">Tutar</th>
            <th>
              <span className="sr-only">Detay</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {transfers.map((t) => (
            <tr key={t.id}>
              <td>
                <button
                  className="transaction-title"
                  onClick={() => onDetail(t)}
                >
                  <span className="transaction-icon">
                    <ArrowLeftRight size={19} />
                  </span>
                  <span>
                    <strong>
                      {t.sourceHolderName} → {t.targetHolderName}
                    </strong>
                    <small>
                      {t.description || "Hesaplar arası transfer"} ·{" "}
                      {t.reference}
                    </small>
                  </span>
                </button>
              </td>
              <td className="nowrap">{date(t.createdAt)}</td>
              <td>
                <Status status={t.status} />
              </td>
              <td className="align-right amount">{money(t.amount)}</td>
              <td>
                <button
                  className="icon-button"
                  aria-label={`${t.reference} transfer detayı`}
                  onClick={() => onDetail(t)}
                >
                  <ChevronRight size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty text="Bu görünümde listelenecek bir transfer bulunamadı." />
  );
}
function HistoryPage({
  transfers,
  onDetail,
  operations = false,
}: {
  transfers: Transfer[];
  onDetail: (t: Transfer) => void;
  operations?: boolean;
}) {
  const [filter, setFilter] = useState(operations ? "PENDING_APPROVAL" : "ALL"),
    [search, setSearch] = useState("");
  const filtered = transfers.filter(
    (t) =>
      (filter === "ALL" || t.status === filter) &&
      `${t.reference} ${t.targetHolderName} ${t.sourceHolderName} ${t.description}`
        .toLocaleLowerCase("tr")
        .includes(search.toLocaleLowerCase("tr")),
  );
  return (
    <section className="panel">
      <div className="list-toolbar">
        <div className="tabs" aria-label="Durum filtresi">
          {[
            ["ALL", "Tümü"],
            ["PENDING_APPROVAL", "Bekleyen"],
            ["COMPLETED", "Tamamlanan"],
            ["REJECTED", "Reddedilen"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? "selected" : ""}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={17} />
          <span className="sr-only">Transfer ara</span>
          <input
            placeholder="Ad veya referans ara"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <TransferTable transfers={filtered} onDetail={onDetail} />
      <div className="list-footer">{filtered.length} işlem listeleniyor</div>
    </section>
  );
}
function Accounts({ accounts }: { accounts: Account[] }) {
  const [selected, setSelected] = useState<number | null>(
      accounts[0]?.id ?? null,
    ),
    [transactions, setTransactions] = useState<Transaction[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const request = useRef(0);
  const load = useCallback(async (id: number) => {
    const current = ++request.current;
    setLoading(true);
    setError("");
    try {
      const rows = await api<Transaction[]>(`/accounts/${id}/transactions`);
      if (current === request.current) setTransactions(rows);
    } catch (e) {
      if (current === request.current) setError(message(e));
    } finally {
      if (current === request.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (selected) void load(selected);
  }, [selected, load]);
  return (
    <>
      <div className="account-grid">
        {accounts.map((a, i) => (
          <button
            key={a.id}
            className={"account-card " + (selected === a.id ? "selected" : "")}
            onClick={() => setSelected(a.id)}
          >
            <div>
              <span className="account-icon">
                <Wallet size={22} />
              </span>
              <span className="account-currency">
                {a.currency} · {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <h2>{a.name}</h2>
            <span className="account-number">{a.accountNumber}</span>
            <strong>{money(a.balance)}</strong>
            <small>
              {a.holderName}
              <span>
                {selected === a.id ? "Seçili hesap" : "Hareketleri gör"}
                <ChevronRight size={13} />
              </span>
            </small>
          </button>
        ))}
      </div>
      <section className="panel">
        <div className="section-title">
          <div>
            <h2>Hesap hareketleri</h2>
            <p>
              {accounts.find((a) => a.id === selected)?.accountNumber ||
                "Hesap bulunamadı"}
            </p>
          </div>
        </div>
        {error ? (
          <ErrorBox>
            {error}
            <button
              className="text-button"
              onClick={() => selected && void load(selected)}
            >
              Yeniden dene
            </button>
          </ErrorBox>
        ) : loading ? (
          <div className="empty" role="status">
            Hareketler yükleniyor…
          </div>
        ) : transactions.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>İşlem</th>
                  <th>Tarih</th>
                  <th className="align-right">Tutar</th>
                  <th className="align-right">İşlem sonrası bakiye</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="transaction-title">
                        <span
                          className={
                            "metric-icon " +
                            (t.type === "CREDIT" ? "incoming" : "outgoing")
                          }
                        >
                          {t.type === "CREDIT" ? (
                            <ArrowDownLeft size={18} />
                          ) : (
                            <ArrowUpRight size={18} />
                          )}
                        </span>
                        <span>
                          <strong>
                            {t.type === "CREDIT"
                              ? "Gelen transfer"
                              : "Giden transfer"}
                          </strong>
                          <small>
                            {t.description || "Hesaplar arası transfer"}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td>{date(t.createdAt)}</td>
                    <td
                      className={
                        "align-right amount " +
                        (t.type === "CREDIT" ? "positive" : "")
                      }
                    >
                      {t.type === "CREDIT" ? "+" : "−"}
                      {money(t.amount)}
                    </td>
                    <td className="align-right amount">
                      {money(t.balanceAfter)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="Bu hesaba ait hareket bulunmuyor." />
        )}
      </section>
    </>
  );
}
function TransferForm({
  accounts,
  beneficiaries,
  onDone,
}: {
  accounts: Account[];
  beneficiaries: Beneficiary[];
  onDone: (t: Transfer) => Promise<void>;
}) {
  const [form, setForm] = useState<TransferInput>({
      sourceAccountId: accounts[0]?.id || 0,
      targetAccountNumber: "",
      amount: "",
      description: "",
    }),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<Transfer | null>(null);
  const attempt = useRef(new TransferAttempt()),
    lock = useRef(false);
  const source = accounts.find((a) => a.id === form.sourceAccountId);
  const update = (key: keyof TransferInput, value: string | number) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors({});
    setError("");
  };
  function review(e: FormEvent) {
    e.preventDefault();
    const validation = validateTransfer(form, source?.accountNumber);
    setErrors(validation);
    if (!Object.keys(validation).length) setConfirm(true);
  }
  async function send() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const body = normalizedInput(form);
      const transfer = await post<Transfer>(
        "/transfers",
        body,
        attempt.current.getKey(body),
      );
      attempt.current.clear();
      setResult(transfer);
      setConfirm(false);
      await onDone(transfer);
    } catch (e) {
      setError(message(e));
      if (e instanceof ApiError && e.fieldErrors) setErrors(e.fieldErrors);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  if (result)
    return (
      <section className="panel success-panel">
        <span className="success-icon">
          {result.status === "PENDING_APPROVAL" ? (
            <Clock size={34} />
          ) : (
            <CheckCircle2 size={34} />
          )}
        </span>
        <span className="eyebrow">{result.reference}</span>
        <h2>
          {result.status === "PENDING_APPROVAL"
            ? "Talebiniz onaya gönderildi."
            : "Transferiniz tamamlandı."}
        </h2>
        <p>
          {result.status === "PENDING_APPROVAL"
            ? "Operasyon ekibinin kararını transfer geçmişinizden takip edebilirsiniz."
            : "Transfer tutarı alıcı hesaba aktarıldı."}
        </p>
        <strong className="success-amount">{money(result.amount)}</strong>
        <p>
          {result.targetHolderName} · {result.targetAccountNumber}
        </p>
        <Status status={result.status} />
        <button
          className="button primary"
          onClick={() => {
            setResult(null);
            setForm({ ...form, amount: "", description: "" });
          }}
        >
          Yeni transfer yap
          <ArrowRight size={17} />
        </button>
      </section>
    );
  return (
    <div className="transfer-layout">
      <section className="panel transfer-panel">
        <div className="section-title">
          <div>
            <h2>Transfer bilgileri</h2>
            <p>
              {confirm
                ? "Bilgileri kontrol ederek transferi onaylayın."
                : "Gönderen hesap ve alıcı bilgilerini seçin."}
            </p>
          </div>
          <span className="step-label">{confirm ? "02" : "01"} / 02</span>
        </div>
        {error && <ErrorBox>{error}</ErrorBox>}
        {confirm ? (
          <>
            <div className="review-summary">
              <span className="eyebrow">GÖNDERİLECEK TUTAR</span>
              <strong>{money(normalizedInput(form).amount)}</strong>
              <dl>
                <div>
                  <dt>Gönderen</dt>
                  <dd>
                    {source?.name}
                    <small>{source?.accountNumber}</small>
                  </dd>
                </div>
                <div>
                  <dt>Alıcı hesap</dt>
                  <dd>{form.targetAccountNumber}</dd>
                </div>
                <div>
                  <dt>Açıklama</dt>
                  <dd>{form.description || "—"}</dd>
                </div>
              </dl>
            </div>
            <div className="notice">
              <ShieldCheck size={20} />
              <span>
                10.000 TL ve üzeri transferler operasyon onayına gönderilir.
                Onay anında bakiye yeniden kontrol edilir.
              </span>
            </div>
            <div className="form-actions">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Düzenle
              </button>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void send()}
              >
                {busy ? "İşleniyor…" : "Transferi onayla"}
                <Check size={18} />
              </button>
            </div>
          </>
        ) : (
          <form noValidate onSubmit={review}>
            <label>
              Gönderen hesap
              <select
                value={form.sourceAccountId}
                onChange={(e) =>
                  update("sourceAccountId", Number(e.target.value))
                }
                aria-invalid={!!errors.sourceAccountId}
              >
                {!accounts.length && (
                  <option value={0}>Hesap bulunamadı</option>
                )}
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {money(a.balance)}
                  </option>
                ))}
              </select>
              {errors.sourceAccountId && (
                <span className="field-error">{errors.sourceAccountId}</span>
              )}
            </label>
            {source && (
              <div className="available-balance">
                Kullanılabilir bakiye<strong>{money(source.balance)}</strong>
              </div>
            )}
            <div className="form-divider" />
            <label>
              Alıcı demo hesap numarası
              <input
                list="beneficiaries"
                value={form.targetAccountNumber}
                onChange={(e) => update("targetAccountNumber", e.target.value)}
                placeholder="BF-0002-TRY"
                aria-invalid={!!errors.targetAccountNumber}
                aria-describedby="recipient-help"
                maxLength={80}
              />
              <datalist id="beneficiaries">
                {beneficiaries
                  .filter((b) => b.accountNumber !== source?.accountNumber)
                  .map((b) => (
                    <option key={b.accountNumber} value={b.accountNumber}>
                      {b.holderName} · {b.label}
                    </option>
                  ))}
              </datalist>
              {errors.targetAccountNumber && (
                <span className="field-error">
                  {errors.targetAccountNumber}
                </span>
              )}
              <span id="recipient-help" className="field-help">
                Yalnızca BankFlow demo hesaplarına transfer yapılabilir.
              </span>
            </label>
            <label>
              Tutar
              <div className="amount-input">
                <input
                  value={form.amount}
                  onChange={(e) => update("amount", e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  aria-invalid={!!errors.amount}
                />
                <span>TL</span>
              </div>
              {errors.amount && (
                <span className="field-error">{errors.amount}</span>
              )}
            </label>
            <label>
              Açıklama <span className="optional">İsteğe bağlı</span>
              <input
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                maxLength={240}
                placeholder="Örn. Kira ödemesi"
              />
              {errors.description && (
                <span className="field-error">{errors.description}</span>
              )}
            </label>
            <div className="form-actions">
              <span>
                <ShieldCheck size={15} />
                Güvenli transfer
              </span>
              <button className="button primary" disabled={!accounts.length}>
                Devam et
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}
      </section>
      <aside className="transfer-aside">
        <div className="guide-card">
          <span className="insight-icon">
            <ArrowLeftRight size={25} />
          </span>
          <h2>Akışın her adımı açık.</h2>
          <div className="guide-step">
            <b>1</b>
            <div>
              <strong>Bilgileri girin</strong>
              <p>Kaynak hesabınızı, alıcıyı ve tutarı belirleyin.</p>
            </div>
          </div>
          <div className="guide-step">
            <b>2</b>
            <div>
              <strong>Kontrol edip onaylayın</strong>
              <p>Transfer özetini son kez gözden geçirin.</p>
            </div>
          </div>
          <div className="guide-step">
            <b>3</b>
            <div>
              <strong>Durumunu takip edin</strong>
              <p>İşleminize transfer geçmişinden ulaşın.</p>
            </div>
          </div>
        </div>
        <div className="transfer-info">
          <ShieldCheck size={20} />
          <p>
            <strong>Ek onay, daha fazla kontrol.</strong>10.000 TL ve üzerindeki
            talepler operasyon ekibinin onayını bekler.
          </p>
        </div>
      </aside>
    </div>
  );
}
function TransferDetail({
  transfer: t,
  user,
  operator,
  onClose,
  onDecision,
}: {
  transfer: Transfer;
  user: User;
  operator: boolean;
  onClose: () => void;
  onDecision: () => Promise<void>;
}) {
  const [reason, setReason] = useState(""),
    [reject, setReject] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false),
    closeRef = useRef<HTMLButtonElement>(null),
    modalRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !lock.current) onClose();
      if (e.key === "Tab") {
        const modal = modalRef.current;
        const nodes = Array.from(
          modal?.querySelectorAll<HTMLElement>(
            "button:not(:disabled), textarea",
          ) ?? [],
        );
        if (!nodes.length) {
          e.preventDefault();
          modal?.focus();
          return;
        }
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  async function decide(kind: "approve" | "reject") {
    if (lock.current) return;
    if (kind === "reject" && reason.trim().length < 3) {
      setError("En az 3 karakterlik bir ret gerekçesi girin.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await post(
        `/operations/transfers/${t.id}/${kind}`,
        kind === "reject" ? { reason: reason.trim() } : {},
      );
      await onDecision();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section
        ref={modalRef}
        className="modal"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">{t.reference}</span>
            <h2 id="detail-title">Transfer detayı</h2>
          </div>
          <button
            ref={closeRef}
            className="icon-button"
            disabled={busy}
            aria-label="Detayı kapat"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <div className="detail-amount">
          {money(t.amount)}
          <Status status={t.status} />
        </div>
        <dl className="detail-list">
          <div>
            <dt>Gönderen</dt>
            <dd>
              {t.sourceHolderName}
              <small>{t.sourceAccountNumber}</small>
            </dd>
          </div>
          <div>
            <dt>Alıcı</dt>
            <dd>
              {t.targetHolderName}
              <small>{t.targetAccountNumber}</small>
            </dd>
          </div>
          <div>
            <dt>İşlem tarihi</dt>
            <dd>{date(t.createdAt)}</dd>
          </div>
          <div>
            <dt>Açıklama</dt>
            <dd>{t.description || "—"}</dd>
          </div>
          {t.decidedAt && (
            <div>
              <dt>Karar tarihi</dt>
              <dd>{date(t.decidedAt)}</dd>
            </div>
          )}
          {t.decisionReason && (
            <div>
              <dt>Karar gerekçesi</dt>
              <dd>{t.decisionReason}</dd>
            </div>
          )}
        </dl>
        {error && <ErrorBox>{error}</ErrorBox>}
        {operator &&
          t.status === "PENDING_APPROVAL" &&
          (t.createdBy === user.id ? (
            <div className="notice">
              <ShieldCheck size={19} />
              Kendi oluşturduğunuz transfer talebini karara bağlayamazsınız.
            </div>
          ) : (
            <>
              {reject && (
                <label>
                  Ret gerekçesi
                  <textarea
                    autoFocus
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={240}
                    placeholder="Talebin neden reddedildiğini açıklayın"
                  />
                </label>
              )}
              <div className="form-actions">
                <button
                  className="button danger"
                  disabled={busy}
                  onClick={() =>
                    reject ? void decide("reject") : setReject(true)
                  }
                >
                  {reject ? "Reddetmeyi onayla" : "Reddet"}
                </button>
                {reject ? (
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => setReject(false)}
                  >
                    Vazgeç
                  </button>
                ) : (
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => void decide("approve")}
                  >
                    {busy ? "İşleniyor…" : "Transferi onayla"}
                    <Check size={17} />
                  </button>
                )}
              </div>
            </>
          ))}
      </section>
    </div>
  );
}
function eventLabel(event: string) {
  return (
    (
      {
        TRANSFER_CREATED: "Transfer oluşturuldu",
        TRANSFER_COMPLETED: "Transfer tamamlandı",
        TRANSFER_APPROVED: "Transfer onaylandı",
        TRANSFER_REJECTED: "Transfer reddedildi",
        LOGIN: "Oturum açıldı",
        LOGOUT: "Oturum kapatıldı",
      } as Record<string, string>
    )[event] || "İşlem kaydı"
  );
}
