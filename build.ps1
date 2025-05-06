$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'

function EscapeNonAscii
{
    $input | ForEach-Object {
        $sb = New-Object System.Text.StringBuilder;
        for ([int] $i = 0; $i -lt $_.Length; $i++)
        {
            $c = $_[$i];
            if ($c -gt 127)
            {
                $sb = $sb.Append("\u").Append(([int] $c).ToString("X").PadLeft(4, "0"));
            }
            else
            {
                $sb = $sb.Append($c);
            }
        }

        Write-Output $sb.ToString();
    }
}

#rollup -f es src/scripts.js | EscapeNonAscii > docs/scripts.js
rollup -f es src/scripts.js | EscapeNonAscii | uglifyjs -c -m --toplevel -O ascii_only > docs/scripts.js
cat src/styles.css | uglifycss > docs/styles.css

copy src/index.html docs/index.html