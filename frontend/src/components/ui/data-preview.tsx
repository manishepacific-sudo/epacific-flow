import React from 'react';
import { motion } from 'framer-motion';
import { Eye, FileText, Database } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DataPreviewProps {
  data: {
    headers: string[];
    preview: any[];
    total?: number;
  };
  className?: string;
}

export function DataPreview({ data, className }: DataPreviewProps) {
  const { headers, preview, total } = data;
  
  if (!preview || preview.length === 0) {
    return (
      <GlassCard className={cn("p-6", className)}>
        <div className="text-center py-8">
          <Database className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No data available to preview</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <GlassCard className={cn("overflow-hidden", className)} glass>
        {/* Header */}
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Eye className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Data Preview</h3>
                <p className="text-sm text-muted-foreground">
                  Parsed data from your uploaded file
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="glass-button">
                <FileText className="h-3 w-3 mr-1" />
                {preview.length} rows
              </Badge>
              {total && total > preview.length && (
                <Badge variant="secondary">
                  +{total - preview.length} more
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full">
              {/* Table Header */}
              <thead className="sticky top-0 bg-card/95 backdrop-blur-sm">
                <tr className="border-b border-border/50">
                  {headers.slice(0, 6).map((header, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-left text-sm font-medium text-foreground/90 border-r border-border/30 last:border-r-0 min-w-[120px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate">{header}</span>
                        {index === 0 && (
                          <div className="w-2 h-2 rounded-full bg-primary/60" />
                        )}
                      </div>
                    </th>
                  ))}
                  {headers.length > 6 && (
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      +{headers.length - 6} more columns
                    </th>
                  )}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {preview.slice(0, 10).map((row, rowIndex) => (
                  <motion.tr
                    key={rowIndex}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: rowIndex * 0.05, duration: 0.3 }}
                    className={cn(
                      "border-b border-border/30 hover:bg-primary/5 transition-colors duration-200",
                      rowIndex % 2 === 0 ? "bg-card/30" : "bg-card/10"
                    )}
                  >
                    {headers.slice(0, 6).map((header, colIndex) => (
                      <td
                        key={colIndex}
                        className="px-4 py-3 text-sm border-r border-border/20 last:border-r-0"
                      >
                        <div className="truncate max-w-[150px]" title={String(row[header] || '')}>
                          {row[header] !== undefined && row[header] !== null ? (
                            <span className="text-foreground/90">
                              {typeof row[header] === 'number' 
                                ? row[header].toLocaleString()
                                : String(row[header])
                              }
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">—</span>
                          )}
                        </div>
                      </td>
                    ))}
                    {headers.length > 6 && (
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        {preview.length > 10 && (
          <div className="px-6 py-4 border-t border-border/50 bg-card/30">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Showing 10 of {preview.length} rows
              </span>
              <Badge variant="outline" className="text-xs">
                {preview.length - 10} more rows available
              </Badge>
            </div>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}