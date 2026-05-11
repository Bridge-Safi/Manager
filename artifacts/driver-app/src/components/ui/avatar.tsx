// @ts-nocheck
import { jsxDEV, Fragment } from "react/jsx-dev-runtime";
import React, { forwardRef } from "react";
"use client";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "../../lib/utils";
const Avatar = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxDEV(
    AvatarPrimitive.Root,
    {
      ref,
      className: cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className
      ),
      ...props
    },
    void 0,
    false
  )
);
Avatar.displayName = AvatarPrimitive.Root.displayName;
const AvatarImage = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxDEV(
    AvatarPrimitive.Image,
    {
      ref,
      className: cn("aspect-square h-full w-full", className),
      ...props
    },
    void 0,
    false
  )
);
AvatarImage.displayName = AvatarPrimitive.Image.displayName;
const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxDEV(
    AvatarPrimitive.Fallback,
    {
      ref,
      className: cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted",
        className
      ),
      ...props
    },
    void 0,
    false
  )
);
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;
export { Avatar, AvatarImage, AvatarFallback };