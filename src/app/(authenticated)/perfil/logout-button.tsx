"use client";

import { Button } from "@/components/ui/button";
import { logout } from "@/app/auth/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button variant="destructive" type="submit" className="w-full">
        Sair da conta
      </Button>
    </form>
  );
}
