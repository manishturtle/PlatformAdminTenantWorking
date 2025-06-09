"use client";

import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Stack,
} from "@mui/material";

interface PortalEntry {
  name: string;
  url: string;
  description?: string;
}

interface FormErrors {
  name?: string;
  url?: string;
}

interface PortalEntryFormProps {
  entry: {
    name: string;
    url: string;
    description?: string;
  };
  onSave: (entry: PortalEntry) => void;
}

const PortalEntryForm: React.FC<PortalEntryFormProps> = ({
  entry,
  onSave,
}) => {
  const [name, setName] = useState(entry.name);
  const [url, setUrl] = useState(entry.url);
  const [description, setDescription] = useState(entry.description || '');
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Portal name is required";
    }

    if (!url.trim()) {
      newErrors.url = "URL is required";
    } else if (!url.startsWith("https://") && !url.startsWith("http://")) {
      newErrors.url = "URL must start with http:// or https://";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const portalEntry: PortalEntry = {
      name: name.trim(),
      url: url.trim(),
    };

    if (description.trim()) {
      portalEntry.description = description.trim();
    }

    onSave(portalEntry);

    // Reset form
    setName(entry.name);
    setUrl(entry.url);
    setDescription(entry.description || '');
    setErrors({});
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={2}>
        <TextField
          fullWidth
          size="small"
          label="Portal Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={!!errors.name}
          helperText={errors.name}
        />
        <TextField
          fullWidth
          size="small"
          label="Portal URL"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          error={!!errors.url}
          helperText={errors.url}
          placeholder="https://example.com"
        />
        <TextField
          fullWidth
          size="small"
          label="Description"
          multiline
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
       
      </Stack>
    </Box>
  );
};

export default PortalEntryForm;
