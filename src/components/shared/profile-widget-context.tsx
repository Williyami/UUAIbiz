import { createContext, useContext, useState, type ReactNode } from "react";
import { ProfileWidget } from "@/components/shared/ProfileWidget";

// App-wide profile widget: any avatar can call openProfile(profile) without the
// page owning dialog state.
const OpenProfileContext = createContext<(profile: any) => void>(() => {});

export function ProfileWidgetProvider({ children }: { children: ReactNode }) {
  const [viewing, setViewing] = useState<any>(null);
  return (
    <OpenProfileContext.Provider value={setViewing}>
      {children}
      <ProfileWidget profile={viewing} onOpenChange={(o) => !o && setViewing(null)} />
    </OpenProfileContext.Provider>
  );
}

export function useOpenProfile() {
  return useContext(OpenProfileContext);
}
