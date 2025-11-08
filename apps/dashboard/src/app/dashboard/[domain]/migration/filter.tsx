"use client";

import { Icons } from "@school-clerk/ui/custom/icons";
import { Menu } from "@/components/menu";
import { generateRandomString } from "@/utils/utils";

import { cookieChanged } from "./cookie";
import { useMigrationStore } from "./store";

interface Props {
  terms?: string[];
  classes?: string[];
  config?;
}
export function Filter({ config, classes, terms }: Props) {
  const __filters = [
    {
      label: "View",
      cookieKey: "view",
      options: [
        "all students",
        "student session record",
        "second term payments",
      ],
      prefix: "View: ",
      suffix: "",
    },
    {
      label: "Enrolled In:",
      cookieKey: "studentEntrolledIn",
      options: ["default", "all", "some"],
      prefix: "Enrolled In: ",
    },
  ];
  const r = useMigrationStore();
  return (
    <div className="flex min-w-max max-w-sm justify-end gap-4">
      {__filters.map((f) => (
        <Menu
          key={f.label}
          Icon={Icons.Filter}
          label={
            config?.[f.cookieKey]
              ? `${f.prefix}${config?.[f.cookieKey]} ${f.suffix}`
              : f.label
          }
        >
          {f.options.map((o, i) => (
            <Menu.Item
              key={i}
              onClick={(e) => {
                cookieChanged({
                  ...config,
                  [f.cookieKey]: o,
                });
                r.update("refreshToken", generateRandomString());
              }}
            >
              {o}
            </Menu.Item>
          ))}
        </Menu>
      ))}
      <Menu
        Icon={Icons.Filter}
        label={config?.term ? `${config?.term} term` : " select term"}
      >
        <Menu.Item
          onClick={(e) => {
            cookieChanged({
              ...config,
              term: null,
            });
            r.update("refreshToken", generateRandomString());
          }}
        >
          All
        </Menu.Item>
        {terms.map((c) => (
          <Menu.Item
            onClick={(e) => {
              cookieChanged({
                ...config,
                term: c,
              });
            }}
            key={c}
          >
            {c}
          </Menu.Item>
        ))}
      </Menu>
      <Menu
        label={config?.class ? `${config?.class}` : " select class"}
        Icon={Icons.Filter}
      >
        <Menu.Item
          onClick={(e) => {
            cookieChanged({
              ...config,
              class: null,
            });
            r.update("refreshToken", generateRandomString());
          }}
        >
          All
        </Menu.Item>
        {classes.map((c) => (
          <Menu.Item
            onClick={(e) => {
              cookieChanged({
                ...config,
                class: c,
              });
              r.update("refreshToken", generateRandomString());
            }}
            key={c}
          >
            {c}
          </Menu.Item>
        ))}
      </Menu>
    </div>
  );
}
