import { createContext, useContext, useState, type ReactNode } from "react";
import { generateApplicationId, generateInvoiceId, type ApplicationData } from "./api";

type AppState = {
  applicationId: string;
  invoiceId: string;
  setInvoiceId: (id: string) => void;
  applicationData: ApplicationData | null;
  setApplicationData: (data: ApplicationData) => void;
};

const AppContext = createContext<AppState>({
  applicationId: "",
  invoiceId: "",
  setInvoiceId: () => {},
  applicationData: null,
  setApplicationData: () => {},
});

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [applicationId] = useState(() => {
    const saved = sessionStorage.getItem("app_id");
    if (saved) return saved;
    const newId = generateApplicationId();
    sessionStorage.setItem("app_id", newId);
    return newId;
  });
  
  const [invoiceId, setInvoiceId] = useState(() => {
    const saved = sessionStorage.getItem("inv_id");
    if (saved) return saved;
    const newId = generateInvoiceId();
    sessionStorage.setItem("inv_id", newId);
    return newId;
  });
  
  const [applicationData, setApplicationData] = useState<ApplicationData | null>(() => {
    const saved = sessionStorage.getItem("app_data");
    return saved ? JSON.parse(saved) : null;
  });

  return (
    <AppContext.Provider value={{
      applicationId, 
      invoiceId, 
      setInvoiceId: (id) => {
        sessionStorage.setItem("inv_id", id);
        setInvoiceId(id);
      }, 
      applicationData, 
      setApplicationData: (data) => {
        if (data) sessionStorage.setItem("app_data", JSON.stringify(data));
        setApplicationData(data);
      }
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
