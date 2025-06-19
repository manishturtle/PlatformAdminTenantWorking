
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

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  FormLabel,
  FormHelperText,
  Select,
  styled,
  MenuItem,
  SelectChangeEvent,
  Popover,
  Autocomplete,
  Grid,
  InputAdornment,
} from '@mui/material';
import { CloudUpload, Image as ImageIcon, Error as ErrorIcon } from '@mui/icons-material';
import { ChromePicker, type ColorResult } from 'react-color';

// Validation schema using Zod
const brandingSchema = z.object({
  themeMode: z.enum(['light', 'dark', 'system'], {
    required_error: 'Theme mode is required',
  }),
  primaryColor: z.string()
    .min(1, 'Primary color is required')
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format'),
  secondaryColor: z.string()
    .min(1, 'Secondary color is required')
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format'),
  font: z.object({
    code: z.string().min(1, 'Font is required'),
    name: z.string().min(1, 'Font is required')
  }),
  lightLogo: z.string().optional(),
  darkLogo: z.string().optional(),
  favicon: z.string().optional(),
});

type BrandingFormData = z.infer<typeof brandingSchema>;

interface BrandingVisualsProps {
  onSave?: (data: BrandingFormData) => Promise<void>;
  isSaving?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

type FontType = {
  code: string;
  name: string;
};

const BrandingVisuals: React.FC<BrandingVisualsProps> = ({
  onSave,
  isSaving = false,
  onDirtyChange
}) => {
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
    trigger
  } = useForm<BrandingFormData>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      themeMode: 'light',
      primaryColor: '#000080',
      secondaryColor: '#D3D3D3',
      font: { code: 'roboto', name: 'Roboto' },
      lightLogo: '',
      darkLogo: '',
      favicon: ''
    }
  });

  // Watch form values and dirty state
  const watchedValues = watch();
  
  // Notify parent when dirty state changes
  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(isDirty);
    }
  }, [isDirty, onDirtyChange]);

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [colorPickerFor, setColorPickerFor] = useState<'primary' | 'secondary' | null>(null);
  const [imagePreviews, setImagePreviews] = useState({
    'light-logo': '',
    'dark-logo': '',
    'favicon': ''
  });

  // States for Autocomplete dropdowns
  const [open, setOpen] = useState({
    font: false
  });

  const [searchQueries, setSearchQueries] = useState({
    font: ''
  });
  
  const selectedFont = watch('font');
  const primaryColor = watch('primaryColor');
  const secondaryColor = watch('secondaryColor');
  const themeMode = watch('themeMode');

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

  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue('themeMode', event.target.value as 'light' | 'dark' | 'system', { shouldDirty: true });
  };

  // Handle font selection change
  const handleFontStyleChange = (newValue: FontType | null): void => {
    setValue('font', newValue || { code: '', name: '' }, { shouldDirty: true });
  };

  const handleSearchQueryChange = (field: string, value: string): void => {
    setSearchQueries((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const filterFonts = (items: FontType[], query: string): FontType[] => {
    return query
      ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
      : items;
  };

  // Filter the fonts based on search query
  const filteredFonts = filterFonts(fonts, searchQueries.font);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'light-logo' | 'dark-logo' | 'favicon') => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        // Handle invalid file type
        console.error('Invalid file type');
        return;
      }

      // Validate file size (2MB max)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        // Handle file too large
        console.error('File is too large');
        return;
      }

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreviews(prev => ({
          ...prev,
          [type]: result
        }));
        
        // Update form value
        const fieldName = type === 'light-logo' ? 'lightLogo' : 
                         type === 'dark-logo' ? 'darkLogo' : 'favicon';
        setValue(fieldName as any, result, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleColorClick = (event: React.MouseEvent<HTMLElement>, type: 'primary' | 'secondary') => {
    setColorPickerFor(type);
    setAnchorEl(event.currentTarget);
  };

  const handleColorClose = () => {
    setAnchorEl(null);
    setColorPickerFor(null);
  };

  const handleColorChange = (color: ColorResult) => {
    if (colorPickerFor === 'primary') {
      setValue('primaryColor', color.hex, { shouldDirty: true });
    } else if (colorPickerFor === 'secondary') {
      setValue('secondaryColor', color.hex, { shouldDirty: true });
    }
  };
  
  const onSubmit = async (data: BrandingFormData) => {
    try {
      if (onSave) {
        await onSave(data);
      }
    } catch (error) {
      console.error('Error saving branding settings:', error);
    }
  };

  return (
    <Box 
      component="form" 
      onSubmit={handleSubmit(onSubmit)}
      sx={{ width: '100%', bgcolor: 'background.default', p: 0 }}
    >
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
                onChange={(e) => handleFileUpload(e, 'light-logo')}
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
                <Controller
                  name="primaryColor"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      size="small"
                      error={!!errors.primaryColor}
                      helperText={errors.primaryColor?.message}
                      sx={{
                        margin: 0,
                        '& .MuiOutlinedInput-root': {
                          height: '40px',
                          borderTopLeftRadius: 0,
                          borderBottomLeftRadius: 0,
                          paddingRight: errors.primaryColor ? '8px' : undefined,
                        },
                      }}
                      InputProps={{
                        endAdornment: errors.primaryColor ? (
                          <InputAdornment position="end">
                            <ErrorIcon color="error" fontSize="small" />
                          </InputAdornment>
                        ) : undefined,
                      }}
                    />
                  )}
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
                <Controller
                  name="secondaryColor"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      size="small"
                      error={!!errors.secondaryColor}
                      helperText={errors.secondaryColor?.message}
                      sx={{
                        margin: 0,
                        '& .MuiOutlinedInput-root': {
                          height: '40px',
                          borderTopLeftRadius: 0,
                          borderBottomLeftRadius: 0,
                          paddingRight: errors.secondaryColor ? '8px' : undefined,
                        },
                      }}
                      InputProps={{
                        endAdornment: errors.secondaryColor ? (
                          <InputAdornment position="end">
                            <ErrorIcon color="error" fontSize="small" />
                          </InputAdornment>
                        ) : undefined,
                      }}
                    />
                  )}
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
            <Controller
              name="font"
              control={control}
              render={({ field: { onChange, value, ...field } }) => (
                <Autocomplete
                  {...field}
                  open={open.font}
                  onOpen={() => setOpen(prev => ({ ...prev, font: true }))}
                  onClose={() => setOpen(prev => ({ ...prev, font: false }))}
                  options={filteredFonts}
                  getOptionLabel={(option) => option?.name || ''}
                  value={value || null}
                  onChange={(_, newValue) => {
                    handleFontStyleChange(newValue);
                    onChange(newValue);
                  }}
                  inputValue={searchQueries.font}
                  onInputChange={(_, newInputValue) => handleSearchQueryChange('font', newInputValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      label="Default Font Style"
                      variant="outlined"
                      error={!!errors.font}
                      helperText={errors.font?.message}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: errors.font ? (
                          <>
                            {params.InputProps.endAdornment}
                            <InputAdornment position="end">
                              <ErrorIcon color="error" fontSize="small" />
                            </InputAdornment>
                          </>
                        ) : (
                          params.InputProps.endAdornment
                        ),
                      }}
                    />
                  )}
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
            <FormControl component="fieldset" error={!!errors.themeMode}>
              <Controller
                name="themeMode"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    row
                    {...field}
                    value={field.value}
                    onChange={(e) => {
                      handleThemeChange(e);
                      field.onChange(e);
                    }}
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
                )}
              />
              {errors.themeMode && (
                <FormHelperText>{errors.themeMode.message}</FormHelperText>
              )}
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