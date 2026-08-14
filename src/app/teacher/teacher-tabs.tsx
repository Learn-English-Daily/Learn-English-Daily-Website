import { BookOpenText, CalendarCheck, Users } from "lucide-react";

const tabs = [
  { href: "/teacher", label: "Attendance", key: "attendance", icon: CalendarCheck },
  { href: "/teacher/journals", label: "Journal", key: "journal", icon: BookOpenText },
  { href: "/teacher/group-classes", label: "Group Classes", key: "group-classes", icon: Users }
] as const;

type TeacherTabKey = (typeof tabs)[number]["key"] | "assessments";

export function TeacherPortalTabs({ active }: { active: TeacherTabKey }) {
  return (
    <nav className="container-shell -mb-4 flex flex-wrap gap-2 pt-5" aria-label="Teacher portal sections">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;

        return (
          <a
            key={tab.key}
            href={tab.href}
            className={`focus-ring inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
              isActive
                ? "bg-lead-blue text-white shadow-soft"
                : "border border-blue-100 bg-white text-lead-navy hover:border-lead-blue hover:text-lead-blue"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}
