# Prepara o terminal para rodar o kit numa máquina na nuvem (rotina do Claude
# Code), que sai para a internet por um proxy com certificado próprio.
# No seu computador não precisa: lá tudo funciona sem isso.
#
# Uso, antes dos outros comandos:  source ferramentas/nuvem.sh

# Certificado do proxy: o primeiro que existir
for ca in "$NODE_EXTRA_CA_CERTS" "$SSL_CERT_FILE" /root/.ccr/ca-bundle.crt /etc/ssl/certs/ca-certificates.crt; do
  if [ -n "$ca" ] && [ -f "$ca" ]; then
    export NODE_EXTRA_CA_CERTS="$ca" SSL_CERT_FILE="$ca" REQUESTS_CA_BUNDLE="$ca"
    break
  fi
done

# O Node só usa o proxy com esta variável
export NODE_USE_ENV_PROXY=1

# O Chromium da máquina já confia no certificado do proxy; o que o Remotion
# baixa não. As fontes já vêm no projeto (src/fontes), então isso é só reserva.
if [ -z "$KIT_NAVEGADOR" ]; then
  for nav in /opt/pw-browsers/chromium "$(command -v chromium)" "$(command -v chromium-browser)" "$(command -v google-chrome)"; do
    if [ -n "$nav" ] && [ -f "$nav" ] && [ -x "$nav" ]; then
      export KIT_NAVEGADOR="$nav"
      break
    fi
  done
fi

echo "Nuvem: proxy=${HTTPS_PROXY:+sim} certificado=${NODE_EXTRA_CA_CERTS:-nenhum} navegador=${KIT_NAVEGADOR:-o do Remotion}"
