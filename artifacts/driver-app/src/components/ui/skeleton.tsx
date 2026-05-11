// @ts-nocheck
import { jsxDEV, Fragment } from "react/jsx-dev-runtime";
import { cn } from "../../lib/utils";
function Skeleton({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: cn("animate-pulse rounded-md bg-primary/10", className),
      ...props
    },
    void 0,
    false
  );
}
export { Skeleton };