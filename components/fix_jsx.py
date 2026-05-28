import re

with open('/home/imaji/smart-ai/smart-ai-dev/frontend-v1/components/naming_clusters.jsx', 'r') as f:
    content = f.read()

loading_jsx = '''      CARD_OPEN
        CardContent className="p-8"
          DIV_OPEN
            Loader2 className="h-10 w-10 text-[#206bc4] animate-spin" /
            DIV_CENTER
              h3 className="text-lg font-semibold text-gray-900 dark:text-white"
                Loading Cluster Data...
              /h3
              p className="text-sm text-gray-500 mt-1"
                Please wait while we fetch the cluster information
              /p
            /div
          /div
        /CardContent
      /Card'''

error_jsx = '''      CARD_BORDER
        CardContent className="p-8"
          DIV_OPEN
            AlertCircle className="h-10 w-10 text-red-500" /
            DIV_CENTER
              h3 className="text-lg font-semibold text-red-600 dark:text-red-400"
                Error Loading Clusters
              /h3
              p className="text-sm text-gray-500 mt-1"OPEN_BRACEerrorCLOSE_BRACE/p
            /div
            Button onClick=OPEN_BRACEfetchClusterNamesCLOSE_BRACE variant="outline"
              RefreshCw className="mr-2 h-4 w-4" /
              Try Again
            /Button
          /div
        /CardContent
      /Card'''

# Replace tokens
loading_jsx = loading_jsx.replace('CARD_OPEN', '      &lt;Card className="shadow-sm"&gt;')
loading_jsx = loading_jsx.replace('CardContent', '      &lt;CardContent')
loading_jsx = loading_jsx.replace('/CardContent', '      &lt;/CardContent&gt;')
loading_jsx = loading_jsx.replace('/Card', '      &lt;/Card&gt;')
loading_jsx = loading_jsx.replace('DIV_OPEN', '      &lt;div className="flex flex-col items-center justify-center gap-4"&gt;')
loading_jsx = loading_jsx.replace('/div', '      &lt;/div&gt;')
loading_jsx = loading_jsx.replace('DIV_CENTER', '      &lt;div className="text-center"&gt;')
loading_jsx = loading_jsx.replace('Loader2', '      &lt;Loader2')
loading_jsx = loading_jsx.replace('/Loader2', '      &lt;/Loader2&gt;')
loading_jsx = loading_jsx.replace('h3', '      &lt;h3')
loading_jsx = loading_jsx.replace('/h3', '      &lt;/h3&gt;')
loading_jsx = loading_jsx.replace('p', '      &lt;p')
loading_jsx = loading_jsx.replace('/p', '      &lt;/p&gt;')

print('Loading JSX length:', len(loading_jsx))
print('Sample:', loading_jsx[:200])

content = content.replace('      LOADING_PLACEHOLDER', loading_jsx)

with open('/home/imaji/smart-ai/smart-ai-dev/frontend-v1/components/naming_clusters.jsx', 'w') as f:
    f.write(content)

print('Done')