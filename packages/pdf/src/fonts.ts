import { Font } from "@react-pdf/renderer";

Font.register({
  family: "Amiri",
  fonts: [
    {
      src: "/fonts/Amiri-Regular.ttf",
      fontWeight: 400,
    },
    {
      src: "/fonts/Amiri-Bold.ttf",
      fontWeight: 700,
    },
  ],
});

Font.register({
  family: "DancingScript",
  fonts: [
    {
      src: "/fonts/DancingScript-Regular.ttf",
      fontWeight: 400,
    },
    {
      src: "/fonts/DancingScript-Bold.ttf",
      fontWeight: 700,
    },
  ],
});

Font.register({
  family: "MoonDance",
  fonts: [
    {
      src: "/fonts/MoonDance-Regular.ttf",
      fontWeight: 400,
    },
  ],
});
