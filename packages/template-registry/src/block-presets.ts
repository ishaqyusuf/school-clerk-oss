import type { EditableFieldDefinition } from "./types";

export function createTestimonialBlockField(input: {
  key: string;
  label?: string;
  description?: string;
  sizeGuidance?: string;
}): EditableFieldDefinition {
  return {
    key: input.key,
    label: input.label ?? "Testimonials",
    description:
      input.description ?? "Repeatable testimonial cards shown in this section.",
    contentType: "object-list",
    blockPreset: "testimonials",
    sizeGuidance: input.sizeGuidance ?? "2-4 items",
    itemFields: [
      {
        key: "quote",
        label: "Quote",
        input: "textarea",
        placeholder: "Short parent or school quote",
      },
      {
        key: "name",
        label: "Name",
        input: "text",
        placeholder: "Speaker name",
      },
      {
        key: "role",
        label: "Role",
        input: "text",
        placeholder: "Speaker role",
      },
    ],
  };
}

export function createGalleryBlockField(input: {
  key: string;
  label?: string;
  description?: string;
  sizeGuidance?: string;
}): EditableFieldDefinition {
  return {
    key: input.key,
    label: input.label ?? "Gallery Cards",
    description:
      input.description ?? "Repeatable image cards used in this section.",
    contentType: "object-list",
    blockPreset: "gallery",
    sizeGuidance: input.sizeGuidance ?? "2-6 items",
    itemFields: [
      {
        key: "title",
        label: "Title",
        input: "text",
        placeholder: "Card title",
      },
      {
        key: "description",
        label: "Description",
        input: "textarea",
        placeholder: "Short supporting description",
      },
      {
        key: "imageUrl",
        label: "Image URL",
        input: "media-asset",
        placeholder: "Select a media asset",
      },
    ],
  };
}

export function createFeatureCardBlockField(input: {
  key: string;
  label?: string;
  description?: string;
  sizeGuidance?: string;
}): EditableFieldDefinition {
  return {
    key: input.key,
    label: input.label ?? "Feature Cards",
    description:
      input.description ?? "Repeatable feature cards used for homepage positioning.",
    contentType: "object-list",
    blockPreset: "feature-cards",
    sizeGuidance: input.sizeGuidance ?? "3-6 items",
    itemFields: [
      {
        key: "title",
        label: "Title",
        input: "text",
        placeholder: "Feature title",
      },
      {
        key: "description",
        label: "Description",
        input: "textarea",
        placeholder: "Short supporting description",
      },
    ],
  };
}

export function createStatCardBlockField(input: {
  key: string;
  label?: string;
  description?: string;
  sizeGuidance?: string;
}): EditableFieldDefinition {
  return {
    key: input.key,
    label: input.label ?? "Stats",
    description:
      input.description ?? "Repeatable number + label cards for trust signals.",
    contentType: "object-list",
    blockPreset: "stat-cards",
    sizeGuidance: input.sizeGuidance ?? "3-5 items",
    itemFields: [
      {
        key: "value",
        label: "Value",
        input: "text",
        placeholder: "98%",
      },
      {
        key: "label",
        label: "Label",
        input: "text",
        placeholder: "Parent satisfaction",
      },
    ],
  };
}

export function createStaffCardBlockField(input: {
  key: string;
  label?: string;
  description?: string;
  sizeGuidance?: string;
}): EditableFieldDefinition {
  return {
    key: input.key,
    label: input.label ?? "Staff Cards",
    description:
      input.description ?? "Repeatable staff profile cards for public pages.",
    contentType: "object-list",
    blockPreset: "staff-cards",
    sizeGuidance: input.sizeGuidance ?? "3-6 items",
    itemFields: [
      { key: "name", label: "Name", input: "text", placeholder: "Staff name" },
      { key: "role", label: "Role", input: "text", placeholder: "Role title" },
      {
        key: "bio",
        label: "Short bio",
        input: "textarea",
        placeholder: "Short staff introduction",
      },
      {
        key: "imageUrl",
        label: "Portrait",
        input: "media-asset",
        placeholder: "Select a portrait asset",
      },
    ],
  };
}

export function createAnnouncementCardBlockField(input: {
  key: string;
  label?: string;
  description?: string;
  sizeGuidance?: string;
}): EditableFieldDefinition {
  return {
    key: input.key,
    label: input.label ?? "Announcements",
    description:
      input.description ?? "Repeatable announcement cards for homepage or news sections.",
    contentType: "object-list",
    blockPreset: "announcement-cards",
    sizeGuidance: input.sizeGuidance ?? "2-5 items",
    itemFields: [
      { key: "title", label: "Title", input: "text", placeholder: "Announcement title" },
      {
        key: "description",
        label: "Description",
        input: "textarea",
        placeholder: "Short announcement summary",
      },
      { key: "date", label: "Date", input: "text", placeholder: "May 12, 2026" },
    ],
  };
}
