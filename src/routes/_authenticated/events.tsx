import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/ComingSoon";
export const Route = createFileRoute("/_authenticated/events")({ component: () => <ComingSoon title="Events" /> });