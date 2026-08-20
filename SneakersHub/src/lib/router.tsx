"use client";

import NextLink from "next/link";
import {
  useRouter,
  usePathname,
  useSearchParams as useNextSearchParams,
  useParams as useNextParams,
} from "next/navigation";
import { forwardRef, useCallback, useEffect, useState } from "react";
import type {
  AnchorHTMLAttributes,
  ComponentProps,
  MouseEvent,
  ReactNode,
} from "react";

export type CompatLinkProps = Omit<ComponentProps<typeof NextLink>, "href" | "onClick"> & {
  to: string;
  state?: unknown;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export const Link = forwardRef<HTMLAnchorElement, CompatLinkProps>(function Link(
  { to, state: _state, onClick, ...props },
  ref,
) {
  return <NextLink ref={ref} href={to} onClick={onClick} {...props} />;
});

export type NavLinkProps = {
  to: string;
  replace?: boolean;
  state?: unknown;
  end?: boolean;
  className?: string | ((args: { isActive: boolean; isPending: boolean }) => string | undefined);
  children?: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "href" | "onClick"> & {
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  {
    to,
    replace,
    className,
    children,
    state: _state,
    end: _end,
    ...props
  },
  ref,
) {
  const pathname = usePathname();
  const isActive = to === "/" ? pathname === to : pathname.startsWith(to);
  const cls = typeof className === "function" ? className({ isActive, isPending: false }) : className;
  return (
    <Link ref={ref} to={to} replace={replace} className={cls} {...props}>
      {children}
    </Link>
  );
});

export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (to: number | string, options?: { replace?: boolean; state?: unknown }) => {
      if (typeof to === "number") {
        if (to === -1) router.back();
        else if (to === 1) router.forward();
        return;
      }
      if (options?.replace) router.replace(to);
      else router.push(to);
    },
    [router],
  );
}

export function useLocation(): {
  pathname: string;
  search: string;
  hash: string;
  state: Record<string, unknown> | null;
  key: string;
} {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  useEffect(() => {
    setSearch(window.location.search);
  }, [pathname]);
  return {
    pathname,
    search,
    hash: "",
    state: null,
    key: "",
  };
}

export function useParams(): Record<string, string> {
  const params = useNextParams() ?? {};
  return params as Record<string, string>;
}

export type SetSearchParamsArg =
  | URLSearchParams
  | string
  | Record<string, string | null | undefined>
  | null;

export function useSearchParams(): [
  ReturnType<typeof useNextSearchParams>,
  (next: SetSearchParamsArg, options?: { replace?: boolean }) => void,
] {
  const searchParams = useNextSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const setSearchParams = useCallback(
    (next: SetSearchParamsArg, options?: { replace?: boolean }) => {
      let qs: string;
      if (typeof next === "string") {
        qs = next.replace(/^\?/, "");
      } else if (next instanceof URLSearchParams) {
        qs = next.toString();
      } else if (next) {
        qs = new URLSearchParams(
          Object.entries(next).filter(([, v]) => v != null) as [string, string][],
        ).toString();
      } else {
        qs = "";
      }
      const href = qs ? `${pathname}?${qs}` : pathname;
      if (options?.replace) router.replace(href);
      else router.push(href);
    },
    [router, pathname],
  );
  return [searchParams, setSearchParams];
}
