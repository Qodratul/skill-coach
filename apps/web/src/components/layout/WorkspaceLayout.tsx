import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useProfile, useLogout } from "../../api";

export function WorkspaceLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useLogout();
  const { data: profile } = useProfile();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const links = [
    { path: "/dashboard", label: "Beranda" },
    { path: "/projects", label: "Proyek" },
    { path: "/portfolio", label: "Portfolio" },
    { path: "/settings", label: "Pengaturan" },
  ];

  const firstName = profile?.displayName?.split(" ")[0] || "Pengguna";
  const initial = profile?.displayName?.[0]?.toUpperCase() || "?";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [dropdownOpen]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <header className="bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-12">
          <Link to="/dashboard" className="inline-flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="grid size-8 place-items-center rounded-lg bg-[#5044b8] text-sm font-bold text-white">S.</span>
            <span>skill coach</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const active = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    active ? "text-[#5044B8]" : "text-slate-700 hover:text-[#5044B8]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <div className="grid size-8 place-items-center rounded-full bg-[#5044B8] text-sm font-semibold text-white">
                {initial}
              </div>
              <span className="hidden sm:inline">{firstName}</span>
              <ChevronDown className="size-4" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
                <div className="border-b border-stone-100 px-4 py-2">
                  <p className="text-sm font-medium text-slate-900">{profile?.displayName || "Pengguna"}</p>
                  <p className="text-xs text-slate-500">{profile?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="size-4" />
                  Keluar
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-12">
        <Outlet />
      </main>
    </div>
  );
}
