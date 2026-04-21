@echo off
title Registrar Chave SSH no Servidor
color 0A
echo ============================================
echo  Registrar chave SSH - JD TELECOM
echo  Digite a senha: @Suremi135706
echo ============================================
echo.

set SERVER=root@72.61.28.164

echo Passo 1: Criando pasta .ssh no servidor...
ssh -o StrictHostKeyChecking=no %SERVER% "mkdir -p ~/.ssh && chmod 700 ~/.ssh"

echo.
echo Passo 2: Enviando chave publica...
scp -o StrictHostKeyChecking=no pubkey.txt %SERVER%:~/.ssh/chave_nova.pub

echo.
echo Passo 3: Registrando chave...
ssh -o StrictHostKeyChecking=no %SERVER% "cat ~/.ssh/chave_nova.pub >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && rm ~/.ssh/chave_nova.pub && echo === CHAVE REGISTRADA COM SUCESSO ==="

echo.
echo ============================================
echo  PRONTO! Agora o deploy sera automatico.
echo ============================================
pause
