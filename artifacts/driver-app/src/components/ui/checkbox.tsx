// @ts-nocheck
import { jsxDEV, Fragment } from "react/jsx-dev-runtime";
import React, { forwardRef } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";
const Checkbox = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxDEV(
    CheckboxPrimitive.Root,
    {
      ref,
      className: cn(
        "grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsxDEV(
        CheckboxPrimitive.Indicator,
        {
          className: cn("grid place-content-center text-current"),
          children: /* @__PURE__ */ jsxDEV(Check, { className: "h-4 w-4" }, void 0, false)
        },
        void 0,
        false
      )
    },
    void 0,
    false
  )
);
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
export { Checkbox };