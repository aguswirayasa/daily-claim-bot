// index.js
import { promises as fs } from "fs";
import path from "path";
import axios from "axios";
import winston from "winston";
import chalk from "chalk";

// Constants
const ACCOUNTS_FILE = "vooi_accounts.json";
const LOG_FILE = "vooi_farming.log";
const API_BASE_URL = "https://api-tg.vooi.io/api";
const FARMING_INTERVAL = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

// Setup Winston logger
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: LOG_FILE }),
  ],
});

// API Client
class VooiAPI {
  constructor() {
    this.axios = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
  }

  async login(initData) {
    const response = await this.axios.post("/v2/auth/login", { initData });
    return response.data;
  }

  async getAutoTrades(token) {
    const response = await this.axios.get("/autotrade", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }

  async claimReward(token, autoTradeId) {
    const response = await this.axios.post(
      "/autotrade/claim",
      { autoTradeId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  }

  async startFarming(token) {
    const response = await this.axios.post(
      "/autotrade/start",
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  }
}

// Account Manager
class AccountManager {
  constructor() {
    this.api = new VooiAPI();
  }

  async loadAccounts() {
    try {
      const data = await fs.readFile(ACCOUNTS_FILE, "utf8");
      return JSON.parse(data);
    } catch (error) {
      logger.error("Failed to load accounts:", error.message);
      return [];
    }
  }

  async farmAccount(account) {
    try {
      // Login
      const loginData = await this.api.login(account.initData);
      const token = loginData.tokens.access_token;
      console.log(chalk.green(`Login successful for account ${account.uid}`));

      // Get auto trades status
      const autoTradesData = await this.api.getAutoTrades(token);

      if (autoTradesData.status === "finished") {
        // Claim rewards
        const claimData = await this.api.claimReward(
          token,
          autoTradesData.autoTradeId
        );
        console.log(
          chalk.green(
            `Rewards claimed for account ${account.uid}: VirtMoney: ${claimData.reward.virtMoney}, VirtPoints: ${claimData.reward.virtPoints}`
          )
        );

        // Start new farming session
        const farmingData = await this.api.startFarming(token);
        console.log(
          chalk.green(
            `Farming started for account ${account.uid}, ends at ${farmingData.endTime}`
          )
        );
      }
    } catch (error) {
      logger.error(
        `Farming error for account ${account.uid}: ${error.message}`
      );
    }
  }
}

// Start the application
(async () => {
  const manager = new AccountManager();
  const accounts = await manager.loadAccounts();

  if (accounts.length === 0) {
    logger.error(
      "No accounts registered. Please add accounts to 'vooi_accounts.json'."
    );
    return;
  }

  console.log(chalk.green("Starting farming process for all accounts..."));

  const farmAccounts = async () => {
    for (const account of accounts) {
      await manager.farmAccount(account);
    }
  };

  // Initial farming
  await farmAccounts();

  // Set up interval for repeated farming
  setInterval(farmAccounts, FARMING_INTERVAL);

  console.log(
    chalk.green(
      `Farming process running. Will repeat every ${
        FARMING_INTERVAL / 1000 / 60 / 60
      } hours.`
    )
  );
  console.log(chalk.green("Keep this window open to continue farming."));
})();
