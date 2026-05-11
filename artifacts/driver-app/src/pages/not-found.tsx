import { jsxDEV, Fragment } from "react/jsx-dev-runtime";
import { Card, CardContent } from "../components/ui/card";
import { AlertCircle } from "lucide-react";
export default function NotFound() {
  return /* @__PURE__ */ jsxDEV("div", { className: "min-h-screen w-full flex items-center justify-center bg-gray-50", children: /* @__PURE__ */ jsxDEV(Card, { className: "w-full max-w-md mx-4", children: /* @__PURE__ */ jsxDEV(CardContent, { className: "pt-6", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex mb-4 gap-2", children: [
      /* @__PURE__ */ jsxDEV(AlertCircle, { className: "h-8 w-8 text-red-500" }, void 0, false),
      /* @__PURE__ */ jsxDEV("h1", { className: "text-2xl font-bold text-gray-900", children: "404 Page Not Found" }, void 0, false)
    ] }, void 0, true),
    /* @__PURE__ */ jsxDEV("p", { className: "mt-4 text-sm text-gray-600", children: "Did you forget to add the page to the router?" }, void 0, false)
  ] }, void 0, true) }, void 0, false) }, void 0, false);
}