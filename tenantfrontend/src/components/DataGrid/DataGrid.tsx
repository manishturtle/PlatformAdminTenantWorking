'use client';

import React from 'react';
import {
  DataGrid as MuiDataGrid,
  GridColDef,
  GridRenderCellParams,
  GridRowId,
  GridValidRowModel,
} from '@mui/x-data-grid';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

export interface DataGridProps<TRow extends GridValidRowModel> {
  rows: TRow[];
  columns: GridColDef[];
  loading?: boolean;
  onEdit?: (id: GridRowId) => void;
  onDelete?: (id: GridRowId) => void;
  showActions?: boolean;
  getRowId?: (row: TRow) => GridRowId;
}

export function DataGrid<TRow extends GridValidRowModel>({
  rows,
  columns,
  loading = false,
  onEdit,
  onDelete,
  showActions = true,
  getRowId,
}: DataGridProps<TRow>) {
  const actionColumn: GridColDef = {
    field: 'actions',
    headerName: 'Actions',
    width: 120,
    sortable: false,
    filterable: false,
    renderCell: (params: GridRenderCellParams) => (
      <Box>
        {onEdit && (
          <Tooltip title="Edit">
            <IconButton
              onClick={() => onEdit(params.id)}
              color="primary"
              size="small"
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
        )}
        {onDelete && (
          <Tooltip title="Delete">
            <IconButton
              onClick={() => onDelete(params.id)}
              color="error"
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    ),
  };

  const finalColumns = showActions ? [...columns, actionColumn] : columns;

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <MuiDataGrid
        rows={rows}
        columns={finalColumns}
        loading={loading}
        autoHeight
        disableRowSelectionOnClick
        getRowId={getRowId}
        pageSizeOptions={[10, 25, 50]}
        initialState={{
          pagination: {
            paginationModel: {
              pageSize: 10,
            },
          },
        }}
      />
    </Box>
  );
};

export default DataGrid;
