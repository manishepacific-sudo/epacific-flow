import { useState } from "react";
import { Search, Filter, Download, Calendar, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";

export interface FilterConfig {
  roles?: string[];
  statuses?: string[];
  additionalFilters?: {
    key: string;
    label: string;
    options: { value: string; label: string }[];
  }[];
}

export interface SearchFilterExportProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: {
    role: string;
    registrar: string;
    status: string;
    dateRange: { from: Date | null; to: Date | null };
    useReportDate: boolean;
    [key: string]: any;
  };
  onFiltersChange: (filters: any) => void;
  filterConfig: FilterConfig;
  onRefresh: () => void;
  onExport: (type: 'all' | 'filtered' | 'active' | 'inactive' | 'date-range') => void;
  exportOptions?: {
    all: string;
    filtered: string;
    active: string;
    inactive: string;
    dateRange?: string;
  };
  isLoading?: boolean;
}

export default function SearchFilterExport({
  searchValue,
  onSearchChange,
  filters,
  onFiltersChange,
  filterConfig,
  onRefresh,
  onExport,
  exportOptions = {
    all: 'All Records',
    filtered: 'Current Filter Results',
    active: 'Active Only',
    inactive: 'Inactive Only',
    dateRange: 'Date Range Results'
  },
  isLoading = false
}: SearchFilterExportProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const { toast } = useToast();

  const clearFilters = () => {
    const clearedFilters = {
      role: 'all',
      registrar: 'all',
      status: 'all',
      dateRange: { from: null, to: null },
      useReportDate: false
    };
    
    // Clear additional filters
    filterConfig.additionalFilters?.forEach(filter => {
      clearedFilters[filter.key] = 'all';
    });
    
    onFiltersChange(clearedFilters);
    setFilterOpen(false);
  };

  const handleExport = (type: 'all' | 'filtered' | 'active' | 'inactive' | 'date-range') => {
    onExport(type);
    setExportOpen(false);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search by name, email, mobile, or address..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex gap-2">
        {/* Refresh Button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>

        {/* Filter Button */}
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="font-medium">Filter Options</div>
              
              {/* Role Filter */}
              {filterConfig.roles && (
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={filters.role}
                    onValueChange={(value) => onFiltersChange({ ...filters, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {filterConfig.roles.map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Registrar Filter */}
              <div className="space-y-2">
                <Label>Registrar</Label>
                <Select
                  value={filters.registrar}
                  onValueChange={(value) => onFiltersChange({ ...filters, registrar: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Registrars</SelectItem>
                    <SelectItem value="registrar1">Registrar 1</SelectItem>
                    <SelectItem value="registrar2">Registrar 2</SelectItem>
                    <SelectItem value="registrar3">Registrar 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              {filterConfig.statuses && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {filterConfig.statuses.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Additional Filters */}
              {filterConfig.additionalFilters?.map(filter => (
                <div key={filter.key} className="space-y-2">
                  <Label>{filter.label}</Label>
                  <Select
                    value={filters[filter.key]}
                    onValueChange={(value) => onFiltersChange({ ...filters, [filter.key]: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All {filter.label}</SelectItem>
                      {filter.options.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              {/* Date Filter Type Toggle */}
              <div className="space-y-2">
                <Label>Filter by:</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="date-filter-type"
                    checked={filters.useReportDate}
                    onCheckedChange={(checked) => 
                      onFiltersChange({ ...filters, useReportDate: checked })
                    }
                  />
                  <Label htmlFor="date-filter-type" className="text-sm">
                    {filters.useReportDate ? 'Report Date' : 'Created Date'}
                  </Label>
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {filters.dateRange.from ? (
                        filters.dateRange.to ? (
                          <>
                            {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                            {format(filters.dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(filters.dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={filters.dateRange.from}
                      selected={{
                        from: filters.dateRange.from,
                        to: filters.dateRange.to
                      }}
                      onSelect={(range) => 
                        onFiltersChange({
                          ...filters,
                          dateRange: { from: range?.from || null, to: range?.to || null }
                        })
                      }
                      numberOfMonths={2}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="flex-1"
                >
                  Clear
                </Button>
                <Button 
                  onClick={() => setFilterOpen(false)}
                  className="flex-1"
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Export Button */}
        <Popover open={exportOpen} onOpenChange={setExportOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export to Excel
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-3">
              <div className="font-medium">Export Options</div>
              <div className="space-y-2">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => handleExport('all')}
                >
                  {exportOptions.all}
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => handleExport('filtered')}
                >
                  {exportOptions.filtered}
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => handleExport('active')}
                >
                  {exportOptions.active}
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => handleExport('inactive')}
                >
                  {exportOptions.inactive}
                </Button>
                {filters.dateRange.from && exportOptions.dateRange && (
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start"
                    onClick={() => handleExport('date-range')}
                  >
                    {exportOptions.dateRange}
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}