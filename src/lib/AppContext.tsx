import { createContext, useContext, useState, type ReactNode } from "react";
import { generateApplicationId, generateInvoiceId, type ApplicationData } from "./api";

type AppState = {
  applicationId: string;
  invoiceId: string;
  applicationData: ApplicationData | null;
  setApplicationData: (data: ApplicationData) => void;
};

const AppContext = createContext<AppState>({
  applicationId: "",
  invoiceId: "",
  applicationData: null,
  setApplicationData: () => {},
});

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [applicationId] = useState(generateApplicationId());
  const [invoiceId] = useState(generateInvoiceId());
  const [applicationData, setApplicationData] = useState<ApplicationData | null>(null);

  return (
    <AppContext.Provider value={{ applicationId, invoiceId, applicationData, setApplicationData }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
