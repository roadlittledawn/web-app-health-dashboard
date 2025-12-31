import { Box, SxProps, Theme } from "@mui/material";
import ReactMarkdown from "react-markdown";

interface MarkdownContentProps {
  children: string;
  variant?: "body1" | "body2";
  sx?: SxProps<Theme>;
}

/**
 * Reusable component for rendering markdown content with proper list styling.
 * Ensures bullets and numbers display correctly for ul/ol elements.
 */
export default function MarkdownContent({
  children,
  variant = "body1",
  sx = {},
}: MarkdownContentProps) {
  return (
    <Box
      sx={{
        typography: variant,
        "& > *": { mb: 1 },
        "& h2": {
          fontSize: "2rem",
          fontWeight: 600,
          mt: 3,
          mb: 2,
          lineHeight: 1.3,
        },
        "& h3": {
          fontSize: "1.5rem",
          fontWeight: 600,
          mt: 2.5,
          mb: 1.5,
          lineHeight: 1.4,
        },
        "& h4": {
          fontSize: "1.15rem",
          fontWeight: 600,
          mt: 2,
          mb: 1,
          lineHeight: 1.5,
        },
        "& ul": {
          listStyleType: "disc",
          paddingLeft: 3,
          mb: 1,
        },
        "& ol": {
          listStyleType: "decimal",
          paddingLeft: 3,
          mb: 1,
        },
        "& li": {
          display: "list-item",
          ml: 1,
        },
        ...sx,
      }}
    >
      <ReactMarkdown>{children}</ReactMarkdown>
    </Box>
  );
}
