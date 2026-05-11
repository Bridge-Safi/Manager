// @ts-nocheck
import { jsxDEV, Fragment } from "react/jsx-dev-runtime";
import React, { forwardRef } from "react";
"use client";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";
const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);
const Label = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxDEV(
    LabelPrimitive.Root,
    {
      ref,
      className: cn(labelVariants(), className),
      ...props
    },
    void 0,
    false
  )
);
Label.displayName = LabelPrimitive.Root.displayName;
export { Label };