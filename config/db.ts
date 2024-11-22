import dotenv from "dotenv";
dotenv.config();

interface DevConfig {
  db: {
    url: string;
  };
  app: {
    port: string;
  };
}

export const dev: DevConfig = {
  db: {
    url: process.env.DBURL || "",
  },
  app: {
    port: process.env.PORT || "",
  },
};
