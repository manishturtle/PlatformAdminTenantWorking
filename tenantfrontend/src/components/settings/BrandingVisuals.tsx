//                 noOptionsText={!searchQueries.font ? 'Type to search for fonts' : 'No fonts found'}
//                 ListboxProps={{
//                   style: {
//                     maxHeight: '220px',
//                     scrollbarWidth: 'thin',
//                     scrollbarColor: '#bdbdbd #f5f5f5',
//                   }
//                 }}
//               />
//               <Typography variant="caption" color="text.secondary">
//                 This font will be used throughout the application
//               </Typography>
//             </Box>
//             <Box>
//               <Typography variant="body2" fontWeight={500} gutterBottom>
//                 Default Theme Mode
//               </Typography>
//               <FormControl component="fieldset">
//                 <RadioGroup
//                   row
//                   value={themeMode}
//                   onChange={handleThemeChange}
//                 >
//                   <FormControlLabel
//                     value="light"
//                     control={<Radio size="small" />}
//                     label="Light"
//                   />
//                   <FormControlLabel
//                     value="dark"
//                     control={<Radio size="small" />}
//                     label="Dark"
//                     sx={{ ml: 3 }}
//                   />
//                   <FormControlLabel
//                     value="system"
//                     control={<Radio size="small" />}
//                     label="System Default"
//                     sx={{ ml: 3 }}
//                   />
//                 </RadioGroup>
//               </FormControl>
//               <Typography variant="caption" color="text.secondary" display="block" mt={1}>
//                 Users can override this setting in their preferences
//               </Typography>
//             </Box>
//           </Box>
//         </Box>
//       </Paper>
//     </Box>
//   );
// };

// export default BrandingVisuals;


"use client";

import React, { useState, useEffect, useCallback } from 'react';
import debounce from 'lodash/debounce';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Select,
  styled,
  MenuItem,
  SelectChangeEvent,
  Popover,
  Autocomplete,
  Grid,
} from '@mui/material';
import { CloudUpload, Image as ImageIcon } from '@mui/icons-material';
import { ChromePicker, type ColorResult } from 'react-color';

export interface BrandingFormData {
  company_logo_light?: {
    url: string;
    filename: string;
  } | null;
  company_logo_dark?: {
    url: string;
    filename: string;
  } | null;
  favicon?: {
    url: string;
    filename: string;
  } | null;
  primary_brand_color?: string;
  secondary_brand_color?: string;
  default_font_style?: string;
  default_theme_mode?: string;
}

interface BrandingVisualsProps {
  onChange: (data: Partial<BrandingFormData>) => void;
  initialData?: Partial<BrandingFormData>;
  isSaving?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

type FontType = {
  code: string;
  name: string;
};

const BrandingVisuals: React.FC<BrandingVisualsProps> = ({
  onChange,
  initialData = {},
  isSaving = false,
  onDirtyChange,
}) => {
  // Initialize state with initialData or defaults
  const [themeMode, setThemeMode] = useState<string>(
    initialData.default_theme_mode || 'light'
  );
  const [primaryColor, setPrimaryColor] = useState<string>(
    initialData.primary_brand_color || '#000080'
  );
  const [secondaryColor, setSecondaryColor] = useState<string>(
    initialData.secondary_brand_color || '#D3D3D3'
  );
  const [selectedFont, setSelectedFont] = useState<FontType | null>(
    initialData.default_font_style
      ? { code: initialData.default_font_style, name: initialData.default_font_style }
      : { code: 'roboto', name: 'Roboto' }
  );
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [colorPickerFor, setColorPickerFor] = useState<'primary' | 'secondary' | null>(null);
  const [imagePreviews, setImagePreviews] = useState({
    'light-logo': initialData.company_logo_light?.url || '',
    'dark-logo': initialData.company_logo_dark?.url || '',
    'favicon': initialData.favicon?.url || '',
  });

  // States for Autocomplete dropdowns
  const [open, setOpen] = useState({
    font: false,
  });

  const [searchQueries, setSearchQueries] = useState({
    font: '',
  });

  // Font data
  const fonts: FontType[] = [
    { name: 'Inter', code: 'inter' },
    { name: 'Roboto', code: 'roboto' },
    { name: 'Poppins', code: 'poppins' },
    { name: 'Montserrat', code: 'montserrat' },
    { name: 'Open Sans', code: 'opensans' },
    { name: 'Underdog', code: 'underdog' },
  ];

  const CustomScrollbar = styled('div')({
    '&::-webkit-scrollbar': {
      width: '6px',
      height: '6px',
    },
    '&::-webkit-scrollbar-track': {
      background: '#f1f1f1',
      borderRadius: '10px',
    },
    '&::-webkit-scrollbar-thumb': {
      background: '#888',
      borderRadius: '10px',
      '&:hover': {
        background: '#555',
      },
    },
  });

  // Debounced callback for onChange
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedOnChange = useCallback(
    debounce((data: Partial<BrandingFormData>) => {
      if (onChange) {
        onChange(data);
      }
    }, 300),
    [onChange]
  );

  // Update parent when form data changes
  useEffect(() => {
    const formData: Partial<BrandingFormData> = {
      default_theme_mode: themeMode,
      primary_brand_color: primaryColor,
      secondary_brand_color: secondaryColor,
      default_font_style: selectedFont?.code,
      // Note: File uploads need to be handled separately
    };

    debouncedOnChange(formData);

    return () => {
      debouncedOnChange.cancel();
    };
  }, [themeMode, primaryColor, secondaryColor, selectedFont, debouncedOnChange]);

  // Handle theme mode change
  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTheme = event.target.value;
    setThemeMode(newTheme);
  };

  // Handle font selection change
  const handleFontStyleChange = (newValue: FontType | null): void => {
    setSelectedFont(newValue);
  };

  const handleSearchQueryChange = (field: string, value: string): void => {
    setSearchQueries((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const filterFonts = (items: FontType[], query: string): FontType[] => {
    return query
      ? items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
      : items;
  };

  // Filter the fonts based on search query
  const filteredFonts = filterFonts(fonts, searchQueries.font);

  const handleColorClick = (event: React.MouseEvent<HTMLElement>, type: 'primary' | 'secondary') => {
    setColorPickerFor(type);
    setAnchorEl(event.currentTarget);
  };

  const handleColorClose = () => {
    setAnchorEl(null);
    setColorPickerFor(null);
  };

  const handleColorChange = (color: ColorResult, type: 'primary' | 'secondary') => {
    if (type === 'primary') {
      setPrimaryColor(color.hex);
    } else {
      setSecondaryColor(color.hex);
    }
  };

  // Handle font selection
  const handleFontChange = (event: React.SyntheticEvent, value: FontType | null) => {
    setSelectedFont(value);
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'light-logo' | 'dark-logo' | 'favicon') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);

    // Update previews
    setImagePreviews((prev) => ({
      ...prev,
      [type]: previewUrl,
    }));

    // Prepare file data for upload
    const fileData = {
      url: previewUrl, // In a real app, upload to your storage and get the URL
      filename: file.name,
    };

    // Update form data
    if (onChange) {
      if (type === 'light-logo') {
        onChange({ company_logo_light: fileData });
      } else if (type === 'dark-logo') {
        onChange({ company_logo_dark: fileData });
      } else if (type === 'favicon') {
        onChange({ favicon: fileData });
      }
    }

    // In a real app, you would upload the file to your storage here
    // and then update the form with the actual URL
  };

  // Track form changes
  const updateDirtyState = useCallback((newValue: boolean) => {
    if (newValue !== isDirty) {
      setIsDirty(newValue);
      if (onDirtyChange) {
        onDirtyChange(newValue);
      }
    }
  }, [isDirty, onDirtyChange]);

  // Notify parent of changes
  const notifyChange = useCallback(
    (updates: Partial<BrandingFormData>) => {
      if (onChange) {
        const formData = {
          default_theme_mode: themeMode,
          primary_brand_color: primaryColor,
          secondary_brand_color: secondaryColor,
          default_font_style: selectedFont?.code,
          ...updates,
        };
        onChange(formData);
        updateDirtyState(true);
      }
    },
    [themeMode, primaryColor, secondaryColor, selectedFont, onChange, updateDirtyState]
  );

  // Handle theme mode change
  const handleThemeModeChange = (event: SelectChangeEvent<'light' | 'dark' | 'system'>) => {
    const newThemeMode = event.target.value as 'light' | 'dark' | 'system';
    setThemeMode(newThemeMode);
    notifyChange({ default_theme_mode: newThemeMode });
  };

  // Handle color changes
  const handlePrimaryColorChange = (color: string) => {
    setPrimaryColor(color);
    notifyChange({ primary_brand_color: color });
  };

  const handleSecondaryColorChange = (color: string) => {
    setSecondaryColor(color);
    notifyChange({ secondary_brand_color: color });
  };

  // Handle font selection
  const handleFontSelection = (event: React.SyntheticEvent, value: FontType | null) => {
    setSelectedFont(value);
    notifyChange({ default_font_style: value?.code });
  };

  // Handle logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // In a real app, upload the file to your server here
      // const formData = new FormData();
      // formData.append('file', file);
      // const response = await fetch('/api/upload', {
      //   method: 'POST',
      //   body: formData,
      // });
      // const result = await response.json();
      // const uploadedUrl = result.url;

      // For demo, create a local URL for preview
      const previewUrl = URL.createObjectURL(file);
      notifyChange({ company_logo_light: { url: previewUrl, filename: file.name } });
    } catch (error) {
      console.error('Error uploading logo:', error);
    }
  };

  // Load initial data
  useEffect(() => {
    if (initialData) {
      if (initialData.default_theme_mode) setThemeMode(initialData.default_theme_mode);
      if (initialData.primary_brand_color) setPrimaryColor(initialData.primary_brand_color);
      if (initialData.secondary_brand_color) setSecondaryColor(initialData.secondary_brand_color);
      if (initialData.default_font_style) setSelectedFont({ code: initialData.default_font_style, name: initialData.default_font_style });
      if (initialData.company_logo_light) setImagePreviews((prev) => ({ ...prev, 'light-logo': initialData.company_logo_light.url }));
      if (initialData.company_logo_dark) setImagePreviews((prev) => ({ ...prev, 'dark-logo': initialData.company_logo_dark.url }));
      if (initialData.favicon) setImagePreviews((prev) => ({ ...prev, favicon: initialData.favicon.url }));
    }
  }, [initialData]);

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.default', p: 0 }}>
      {/* Color Picker Popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleColorClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <ChromePicker
          color={colorPickerFor === 'primary' ? primaryColor : secondaryColor}
          onChange={handleColorChange}
        />
      </Popover>

      {/* Company Logo - Light Background Card */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6" fontWeight="bold">Company Logo (Light Background)</Typography>
          <Typography variant="caption" color="error" fontWeight={500}>Required</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          This logo will be displayed on light backgrounds throughout the application
        </Typography>
        <Box display="flex" alignItems="center" flexWrap="wrap">
          <Box
            width={120}
            height={120}
            bgcolor="grey.100"
            borderRadius={1}
            display="flex"
            alignItems="center"
            justifyContent="center"
            mr={{ xs: 0, sm: 3 }}
            mb={{ xs: 2, sm: 0 }}
            overflow="hidden"
          >
            {imagePreviews['light-logo'] ? (
              <img
                src={imagePreviews['light-logo']}
                alt="Light logo preview"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <ImageIcon sx={{ color: 'grey.400', fontSize: 40 }} />
            )}
          </Box>
          <Box>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUpload />}
              sx={{ mb: 1 }}
            >
              Upload Logo
              <input
                type="file"
                hidden
                accept="image/png, image/svg+xml"
                onChange={(e) => handleLogoUpload(e)}
              />
            </Button>
            <Typography variant="caption" color="text.secondary" display="block">
              Recommended size: 200x200px. PNG or SVG format preferred.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Company Logo - Dark Background Card */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6" fontWeight="bold">Company Logo (Dark Background)</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>Optional</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          This logo will be displayed on dark backgrounds throughout the application
        </Typography>
        <Box display="flex" alignItems="center" flexWrap="wrap">
          <Box
            width={120}
            height={120}
            bgcolor="grey.800"
            borderRadius={1}
            display="flex"
            alignItems="center"
            justifyContent="center"
            mr={{ xs: 0, sm: 3 }}
            mb={{ xs: 2, sm: 0 }}
            overflow="hidden"
          >
            {imagePreviews['dark-logo'] ? (
              <img
                src={imagePreviews['dark-logo']}
                alt="Dark logo preview"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <ImageIcon sx={{ color: 'grey.500', fontSize: 40 }} />
            )}
          </Box>
          <Box>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUpload />}
              sx={{ mb: 1 }}
            >
              Upload Logo
              <input
                type="file"
                hidden
                accept="image/png, image/svg+xml"
                onChange={(e) => handleFileUpload(e, 'dark-logo')}
              />
            </Button>
            <Typography variant="caption" color="text.secondary" display="block">
              Recommended size: 200x200px. PNG or SVG format preferred.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Favicon Card */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6" fontWeight="bold">Favicon</Typography>
          <Typography variant="caption" color="error" fontWeight={500}>Required</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          This icon will be displayed in browser tabs
        </Typography>
        <Box display="flex" alignItems="center" flexWrap="wrap">
          <Box
            width={64}
            height={64}
            bgcolor="grey.100"
            borderRadius={1}
            display="flex"
            alignItems="center"
            justifyContent="center"
            mr={{ xs: 0, sm: 3 }}
            mb={{ xs: 2, sm: 0 }}
            overflow="hidden"
          >
            {imagePreviews['favicon'] ? (
              <img
                src={imagePreviews['favicon']}
                alt="Favicon preview"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <ImageIcon sx={{ color: 'grey.400', fontSize: 24 }} />
            )}
          </Box>
          <Box>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUpload />}
              sx={{ mb: 1 }}
            >
              Upload Favicon
              <input
                type="file"
                hidden
                accept="image/x-icon,image/png,image/svg+xml"
                onChange={(e) => handleFileUpload(e, 'favicon')}
              />
            </Button>
            <Typography variant="caption" color="text.secondary" display="block">
              Recommended size: 32x32px or 64x64px. ICO, PNG or SVG format.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Brand Colors Card */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={600} mb={1}>Brand Colors</Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          These colors will be used throughout the application
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
              Primary Brand Color
            </Typography>
            <Box display="flex" alignItems="center" sx={{ gap: 0 }}>
                 <Box
                  width={48}
                  height={40}
                  bgcolor={primaryColor}
                  borderRadius="4px 0 0 4px"
                  border="1px solid"
                  borderColor="divider"
                  borderRight="none"
                  onClick={(e) => handleColorClick(e, 'primary')}
                  sx={{ cursor: 'pointer' }}
                />
                <TextField
                  fullWidth
                  size="small"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  sx={{
                    margin: 0,
                    '& .MuiOutlinedInput-root': {
                      height: '40px',
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0
                    }
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Used for buttons, links and primary actions
              </Typography>
            
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
              Secondary Brand Color
            </Typography>
            
            <Box display="flex" alignItems="center" sx={{ gap: 0 }}>
                <Box
                  width={48}
                  height={40}
                  bgcolor={secondaryColor}
                  borderRadius="4px 0 0 4px"
                  border="1px solid"
                  borderColor="divider"
                  borderRight="none"
                  onClick={(e) => handleColorClick(e, 'secondary')}
                  sx={{ cursor: 'pointer' }}
                />
                <TextField
                  fullWidth
                  size="small"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  sx={{
                    margin: 0,
                    '& .MuiOutlinedInput-root': {
                      height: '40px',
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0
                    }
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Used for secondary elements and accents
              </Typography>
           
          
          </Grid>
        </Grid>
      </Paper>
      
      {/* Typography & Theme Card */}
      <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="bold" mb={1}>Typography & Theme</Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Configure the look and feel of your application
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Autocomplete
              open={open.font}
              onOpen={() => setOpen(prev => ({ ...prev, font: true }))}
              onClose={() => setOpen(prev => ({ ...prev, font: false }))}
              options={filteredFonts}
              getOptionLabel={(option) => option.name}
              value={selectedFont}
              onChange={(_, newValue) => handleFontStyleChange(newValue)}
              inputValue={searchQueries.font}
              onInputChange={(_, newInputValue) => handleSearchQueryChange('font', newInputValue)}
              renderInput={(params) => (
                <TextField
                  {...params} 
                  size="small"
                  label="Default Font Style"
                  variant="outlined"
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.code}>
                  {option.name}
                </li>
              )}
              ListboxComponent={CustomScrollbar}
              ListboxProps={{
                style: {
                  maxHeight: 200,
                  paddingRight: '8px',
                },
              }}
              PaperComponent={({ children }) => (
                <Paper 
                  sx={{ 
                    width: 'auto',
                    minWidth: '300px',
                    boxShadow: 3,
                    mt: 0.5,
                    '& .MuiAutocomplete-listbox': {
                      p: 0,
                    },
                    '& .MuiAutocomplete-option': {
                      minHeight: '40px',
                      '&[data-focus="true"]': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      },
                      '&[aria-selected="true"]': {
                        backgroundColor: 'rgba(25, 118, 210, 0.08)',
                        '&.Mui-focused': {
                          backgroundColor: 'rgba(25, 118, 210, 0.12)',
                        },
                      },
                    },
                  }}
                >
                  {children}
                </Paper>
              )}
              sx={{
                '& .MuiAutocomplete-popper': {
                  minWidth: '300px',
                },
                '& .MuiAutocomplete-inputRoot': {
                  paddingRight: '8px !important',
                },
              }}
              noOptionsText={!searchQueries.font ? 'Type to search for fonts' : 'No fonts found'}
            />
            <Typography variant="caption" color="text.secondary">
              This font will be used throughout the application
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
              Default Theme Mode
            </Typography>
            <FormControl component="fieldset">
              <RadioGroup
                row
                value={themeMode}
                onChange={handleThemeChange}
              >
                <FormControlLabel
                  value="light"
                  control={<Radio size="small" />}
                  label="Light"
                />
                <FormControlLabel
                  value="dark"
                  control={<Radio size="small" />}
                  label="Dark"
                />
                <FormControlLabel
                  value="system"
                  control={<Radio size="small" />}
                  label="System Default"
                />
              </RadioGroup>
            </FormControl>
            <Typography variant="caption" color="text.secondary" display="block">
              Users can override this setting in their preferences
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default BrandingVisuals;