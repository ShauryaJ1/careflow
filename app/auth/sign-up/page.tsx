import { SignUpForm } from "@/components/sign-up-form";

export default function Page({
  searchParams,
}: {
  searchParams: { role?: string };
}) {
  const role = searchParams.role as "patient" | "provider" | undefined;
  
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignUpForm role={role} />
      </div>
    </div>
  );
}
