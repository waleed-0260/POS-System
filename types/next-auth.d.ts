import "next-auth";

declare module "next-auth" {
  interface User {
    role: "OWNER" | "CASHIER";
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: "OWNER" | "CASHIER";
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: "OWNER" | "CASHIER";
  }
}
