export type ProjectItem = {
  id: number;
  title: string;
  category: string;
  location: string;
  progress: number;
  status: "Active" | "Draft";
  image: string | null;
  imageAlt: string;
  reorderImage?: string;
  mediaImage?: string;
  icon: "building" | "hospital" | "plane" | null;
  formName: string;
  formLocation: string;
  description: string;
  fileName: string | null;
};

// Project categories used to live here. They are a production contract now:
// see @/lib/portfolio-projects/project-categories.
