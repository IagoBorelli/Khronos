export {}

declare global {
  interface Window {
    api: {
      getData: (key: string) => Promise<any>;
      setData: (key: string, value: any) => Promise<boolean>;
      onNavigate: (callback: (tab: string) => void) => void;
    }
  }
}