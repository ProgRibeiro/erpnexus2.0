import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.erpnexus.app",
  appName: "ERP Nexus",
  webDir: "frontend_dist_mobile",

  // Live reload em celular na mesma rede:
  // 1. Ajuste a URL para o IP da sua maquina.
  // 2. Rode: npm run dev -- --host
  // 3. Rode: npm run mobile:run:android
  //
  // server: {
  //   url: "http://192.168.0.100:5173",
  //   cleartext: true,
  // },
};

export default config;
