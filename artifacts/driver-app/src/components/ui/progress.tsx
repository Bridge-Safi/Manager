// @ts-nocheck
import { jsxDEV, Fragment } from "react/jsx-dev-runtime";
import React, { forwardRef } from "react";
"use client";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "../../lib/utils";
const Progress = React.forwardRef(({ className, value, ...props }, ref) => /* @__PURE__ */ jsxDEV(
    ProgressPrimitive.Root,
    {
      ref,
      className: cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsxDEV(
        ProgressPrimitive.Indicator,
        {
          className: "h-full w-full flex-1 bg-primary transition-all",
          style: { transform: `translateX(-${100 - (value || 0)}%)` }
        },
        void 0,
        false
      )
    },
    void 0,
    false
  )
);
Progress.displayName = ProgressPrimitive.Root.displayName;
export { Progress };