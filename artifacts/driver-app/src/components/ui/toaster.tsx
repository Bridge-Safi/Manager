// @ts-nocheck
import { jsxDEV, Fragment } from "react/jsx-dev-runtime";
import { useToast } from "../../hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport
} from "./toast";
export function Toaster() {
  const { toasts } = useToast();
  return /* @__PURE__ */ jsxDEV(ToastProvider, { children: [
    toasts.map(function({ id, title, description, action, ...props }) {
      return /* @__PURE__ */ jsxDEV(Toast, { ...props, children: [
        /* @__PURE__ */ jsxDEV("div", { className: "grid gap-1", children: [
          title && /* @__PURE__ */ jsxDEV(ToastTitle, { children: title }, void 0, false),
          description && /* @__PURE__ */ jsxDEV(ToastDescription, { children: description }, void 0, false)
        ] }, void 0, true),
        action,
        /* @__PURE__ */ jsxDEV(ToastClose, {}, void 0, false)
      ] }, id, true);
    }),
    /* @__PURE__ */ jsxDEV(ToastViewport, {}, void 0, false)
  ] }, void 0, true);
}
