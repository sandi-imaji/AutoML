import sys

lt = chr(60)
gt = chr(62)
quote = chr(34)
sq = chr(39)

main_jsx = lt + 'Card className=' + quote + 'shadow-sm' + quote + gt + '''
      ''' + lt + 'CardHeader className=' + quote + 'border-b border-gray-100 dark:border-gray-800' + quote + gt + '''
        ''' + lt + 'div className=' + quote + 'flex items-center gap-3' + quote + gt + '''
          ''' + lt + 'div className=' + quote + 'p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg' + quote + gt + '''
            ''' + lt + 'Sparkles className=' + quote + 'h-5 w-5 text-white' + quote + ' />' + '''
          ''' + lt + '/div' + gt + '''
          ''' + lt + 'div' + gt + '''
            ''' + lt + 'CardTitle className=' + quote + 'text-xl font-bold' + quote + gt + '''Cluster Name Management''' + lt + '/CardTitle' + gt + '''
            ''' + lt + 'CardDescription className=' + quote + 'text-sm mt-1' + quote + gt + '''
              Manage custom names for your clusters to make them more meaningful and easier to understand.
            ''' + lt + '/CardDescription' + gt + '''
          ''' + lt + '/div' + gt + '''
        ''' + lt + '/div' + gt + '''
      ''' + lt + '/CardHeader' + gt + '''
      
      ''' + lt + 'CardContent className=' + quote + 'p-6 space-y-6' + quote + gt + '''
        {hasChanges && (
          ''' + lt + 'Alert className=' + quote + 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' + quote + gt + '''
            ''' + lt + 'AlertCircle className=' + quote + 'h-4 w-4 text-amber-600 dark:text-amber-400' + quote + ' />' + '''
            ''' + lt + 'AlertDescription className=' + quote + 'text-amber-700 dark:text-amber-300' + quote + gt + '''
              You have unsaved changes. Don''' + sq + '''t forget to save your updates!
            ''' + lt + '/AlertDescription' + gt + '''
          ''' + lt + '/Alert' + gt + '''
        )}

        ''' + lt + 'div className=' + quote + 'grid grid-cols-1 lg:grid-cols-2 gap-6' + quote + gt + '''
          {/* SC Clusters Section */}
          ''' + lt + 'div className=' + quote + 'space-y-4' + quote + gt + '''
            ''' + lt + 'div className=' + quote + 'flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800' + quote + gt + '''
              ''' + lt + 'div className=' + quote + 'p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg' + quote + gt + '''
                ''' + lt + 'Sparkles className=' + quote + 'h-4 w-4 text-white' + quote + ' />' + '''
              ''' + lt + '/div' + gt + '''
              ''' + lt + 'div' + gt + '''
                ''' + lt + 'h3 className=' + quote + 'text-lg font-semibold text-gray-900 dark:text-white' + quote + gt + '''
                  Spectral Clustering
                ''' + lt + '/h3' + gt + '''
                ''' + lt + 'Badge variant=' + quote + 'secondary' + quote + ' className=' + quote + 'text-xs' + quote + gt + '''SC Algorithm''' + lt + '/Badge' + gt + '''
              ''' + lt + '/div' + gt + '''
            ''' + lt + '/div' + gt + '''
            
            ''' + lt + 'div className=' + quote + 'space-y-3' + quote + gt + '''
              {scClusters.map((cluster) => (
                ''' + lt + '''div 
                  key={cluster} 
                  className=' + quote + 'flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-colors' + quote + '''
                ''' + gt + '''
                  ''' + lt + 'div className=' + quote + 'flex-shrink-0' + quote + gt + '''
                    ''' + lt + 'Badge variant=' + quote + 'outline' + quote + ' className=' + quote + 'font-mono text-xs bg-white dark:bg-gray-800' + quote + gt + '''
                      {cluster}
                    ''' + lt + '/Badge' + gt + '''
                  ''' + lt + '/div' + gt + '''
                  ''' + lt + 'div className=' + quote + 'flex items-center gap-2 flex-1' + quote + gt + '''
                    ''' + lt + 'span className=' + quote + 'text-gray-400 text-sm' + quote + gt + '''→''' + lt + '/span' + gt + '''
                    ''' + lt + 'Input
                      type=' + quote + 'text' + quote + '''
                      value={clusterMappings.sc[cluster] || ''' + sq + sq + '''}
                      onChange={(e) => handleInputChange(''' + sq + 'sc' + sq + ''', cluster, e.target.value)}
                      placeholder=' + quote + 'Enter custom name' + quote + '''
                      className=' + quote + 'flex-1 h-9 text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500' + quote + '''
                    />
                  ''' + lt + '/div' + gt + '''
                ''' + lt + '/div' + gt + '''
              ))}
            ''' + lt + '/div' + gt + '''
          ''' + lt + '/div' + gt + '''

          ''' + lt + 'Separator className=' + quote + 'lg:hidden' + quote + ' />' + '''

          {/* K-Means Section */}
          ''' + lt + 'div className=' + quote + 'space-y-4' + quote + gt + '''
            ''' + lt + 'div className=' + quote + 'flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800' + quote + gt + '''
              ''' + lt + 'div className=' + quote + 'p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg' + quote + gt + '''
                ''' + lt + 'Database className=' + quote + 'h-4 w-4 text-white' + quote + ' />' + '''
              ''' + lt + '/div' + gt + '''
              ''' + lt + 'div' + gt + '''
                ''' + lt + 'h3 className=' + quote + 'text-lg font-semibold text-gray-900 dark:text-white' + quote + gt + '''
                  K-Means Clustering
                ''' + lt + '/h3' + gt + '''
                ''' + lt + 'Badge variant=' + quote + 'secondary' + quote + ' className=' + quote + 'text-xs' + quote + gt + '''K-Means Algorithm''' + lt + '/Badge' + gt + '''
              ''' + lt + '/div' + gt + '''
            ''' + lt + '/div' + gt + '''
            
            ''' + lt + 'div className=' + quote + 'space-y-3' + quote + gt + '''
              {kmeansClusters.map((cluster) => (
                ''' + lt + '''div 
                  key={cluster} 
                  className=' + quote + 'flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors' + quote + '''
                ''' + gt + '''
                  ''' + lt + 'div className=' + quote + 'flex-shrink-0' + quote + gt + '''
                    ''' + lt + 'Badge variant=' + quote + 'outline' + quote + ' className=' + quote + 'font-mono text-xs bg-white dark:bg-gray-800' + quote + gt + '''
                      {cluster}
                    ''' + lt + '/Badge' + gt + '''
                  ''' + lt + '/div' + gt + '''
                  ''' + lt + 'div className=' + quote + 'flex items-center gap-2 flex-1' + quote + gt + '''
                    ''' + lt + 'span className=' + quote + 'text-gray-400 text-sm' + quote + gt + '''→''' + lt + '/span' + gt + '''
                    ''' + lt + 'Input
                      type=' + quote + 'text' + quote + '''
                      value={clusterMappings.kmeans[cluster] || ''' + sq + sq + '''}
                      onChange={(e) => handleInputChange(''' + sq + 'kmeans' + sq + ''', cluster, e.target.value)}
                      placeholder=' + quote + 'Enter custom name' + quote + '''
                      className=' + quote + 'flex-1 h-9 text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-emerald-500' + quote + '''
                    />
                  ''' + lt + '/div' + gt + '''
                ''' + lt + '/div' + gt + '''
              ))}
            ''' + lt + '/div' + gt + '''
          ''' + lt + '/div' + gt + '''
        ''' + lt + '/div' + gt + '''

        ''' + lt + 'Separator />' + '''

        ''' + lt + 'div className=' + quote + 'flex justify-end gap-3' + quote + gt + '''
          ''' + lt + '''Button 
            variant=' + quote + 'outline' + quote + ''' 
            onClick={handleReset}
            disabled={saving || !hasChanges}
            className=' + quote + 'gap-2' + quote + '''
          ''' + gt + '''
            ''' + lt + 'RefreshCw className=' + quote + 'h-4 w-4' + quote + ' />' + '''
            Reset Changes
          ''' + lt + '/Button' + gt + '''
          ''' + lt + '''Button 
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className=' + quote + 'bg-[#206bc4] hover:bg-[#1a5ba3] gap-2' + quote + '''
          ''' + gt + '''
            {saving ? (
              ''' + lt + '>' + '''
                ''' + lt + 'Loader2 className=' + quote + 'h-4 w-4 animate-spin' + quote + ' />' + '''
                Saving...
              ''' + lt + '/>' + '''
            ) : (
              ''' + lt + '>' + '''
                ''' + lt + 'Save className=' + quote + 'h-4 w-4' + quote + ' />' + '''
                Save Changes
              ''' + lt + '/>' + '''
            )}
          ''' + lt + '/Button' + gt + '''
        ''' + lt + '/div' + gt + '''
      ''' + lt + '/CardContent' + gt + '''
    ''' + lt + '/Card'

with open('/home/imaji/smart-ai/smart-ai-dev/frontend-v1/components/naming_clusters.jsx', 'r') as f:
    content = f.read()

content = content.replace('    PLACEHOLDER', main_jsx)

with open('/home/imaji/smart-ai/smart-ai-dev/frontend-v1/components/naming_clusters.jsx', 'w') as f:
    f.write(content)

print('Main JSX inserted')