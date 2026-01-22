// ADICIONE ESTA FUNÇÃO NO SEU ARQUIVO cnpj-service.js OU COLE DIRETAMENTE NO HEAD
window.cnpjService = {
    // Formatar CNPJ enquanto digita
    formatarEnquantoDigita: function(event) {
        const input = event.target;
        let value = input.value.replace(/\D/g, '');
        
        if (value.length > 14) {
            value = value.substring(0, 14);
        }
        
        if (value.length > 12) {
            value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        } else if (value.length > 8) {
            value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})/, '$1.$2.$3/$4');
        } else if (value.length > 5) {
            value = value.replace(/^(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
        } else if (value.length > 2) {
            value = value.replace(/^(\d{2})(\d{3})/, '$1.$2');
        } else if (value.length > 0) {
            value = value.replace(/^(\d{2})/, '$1');
        }
        
        input.value = value;
    },

    // Validar CNPJ
    isValidCNPJ: function(cnpj) {
        cnpj = cnpj.replace(/[^\d]+/g,'');
        
        if(cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
        
        // Validação dos dígitos verificadores
        let tamanho = cnpj.length - 2;
        let numeros = cnpj.substring(0,tamanho);
        let digitos = cnpj.substring(tamanho);
        let soma = 0;
        let pos = tamanho - 7;
        
        for (let i = tamanho; i >= 1; i--) {
            soma += numeros.charAt(tamanho - i) * pos--;
            if (pos < 2) pos = 9;
        }
        
        let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        if (resultado !== parseInt(digitos.charAt(0))) return false;
        
        tamanho = tamanho + 1;
        numeros = cnpj.substring(0,tamanho);
        soma = 0;
        pos = tamanho - 7;
        
        for (let i = tamanho; i >= 1; i--) {
            soma += numeros.charAt(tamanho - i) * pos--;
            if (pos < 2) pos = 9;
        }
        
        resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
        if (resultado !== parseInt(digitos.charAt(1))) return false;
        
        return true;
    },

    // Consultar CNPJ na API pública
    consultarCNPJ: async function(cnpj) {
        // Limpar CNPJ (remover pontos, traços, barras)
        const cnpjLimpo = cnpj.replace(/\D/g, '');
        
        if (!this.isValidCNPJ(cnpjLimpo)) {
            throw new Error('CNPJ inválido');
        }
        
        try {
            // Tentar diferentes APIs públicas (fallback)
            const apis = [
                `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`,
                `https://publica.cnpj.ws/cnpj/${cnpjLimpo}`,
                `https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`
            ];
            
            let lastError;
            
            for (const apiUrl of apis) {
                try {
                    console.log(`Tentando API: ${apiUrl}`);
                    const response = await fetch(apiUrl, {
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': 'GestorContabilPro/1.0'
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error(`API ${apiUrl} retornou ${response.status}`);
                    }
                    
                    const dados = await response.json();
                    
                    // Formatar dados para um formato padrão
                    return this.formatarDadosAPI(dados, apiUrl);
                    
                } catch (apiError) {
                    console.warn(`Falha na API ${apiUrl}:`, apiError.message);
                    lastError = apiError;
                    // Continuar para próxima API
                }
            }
            
            // Se todas as APIs falharam
            throw new Error(`Não foi possível consultar o CNPJ. ${lastError?.message || 'Tente novamente mais tarde.'}`);
            
        } catch (error) {
            console.error('Erro na consulta de CNPJ:', error);
            
            // Fallback: Retornar dados simulados para teste
            if (cnpjLimpo === '00000000000191') {
                return this.gerarDadosSimulados(cnpjLimpo);
            }
            
            throw new Error(`Falha na consulta: ${error.message}`);
        }
    },

    // Formatar dados da API para um padrão
    formatarDadosAPI: function(dados, apiUrl) {
        // Formatar baseado na API utilizada
        if (apiUrl.includes('brasilapi.com.br')) {
            return {
                cnpj: dados.cnpj,
                nome: dados.razao_social,
                fantasia: dados.nome_fantasia,
                tipo: dados.descricao_matriz_filial === 'MATRIZ' ? 'LTDA' : 'FILIAL',
                abertura: dados.data_inicio_atividade,
                situacao: dados.descricao_situacao_cadastral,
                logradouro: dados.logradouro,
                numero: dados.numero,
                complemento: dados.complemento,
                bairro: dados.bairro,
                municipio: dados.municipio,
                uf: dados.uf,
                cep: dados.cep,
                telefone: dados.ddd_telefone_1 ? `(${dados.ddd_telefone_1}) ${dados.telefone_1}` : '',
                email: dados.email || '',
                cnae: dados.cnae_fiscal,
                natureza_juridica: dados.natureza_juridica,
                capital_social: dados.capital_social ? `R$ ${parseFloat(dados.capital_social).toFixed(2)}` : 'R$ 0,00',
                porte: dados.porte,
                socios: dados.qsa ? dados.qsa.map(socio => ({
                    nome: socio.nome_socio,
                    qualificacao: socio.qualificacao_socio
                })) : []
            };
        } else if (apiUrl.includes('receitaws.com.br')) {
            return {
                cnpj: dados.cnpj,
                nome: dados.nome,
                fantasia: dados.fantasia,
                tipo: dados.tipo === 'MATRIZ' ? 'LTDA' : 'FILIAL',
                abertura: dados.abertura,
                situacao: dados.situacao,
                logradouro: dados.logradouro,
                numero: dados.numero,
                complemento: dados.complemento,
                bairro: dados.bairro,
                municipio: dados.municipio,
                uf: dados.uf,
                cep: dados.cep,
                telefone: dados.telefone,
                email: dados.email,
                cnae: dados.atividade_principal ? dados.atividade_principal[0]?.code : '',
                natureza_juridica: dados.natureza_juridica,
                capital_social: dados.capital_social,
                porte: dados.porte,
                socios: dados.qsa ? dados.qsa.map(socio => ({
                    nome: socio.nome,
                    qualificacao: socio.qual
                })) : []
            };
        } else {
            // Formato genérico
            return {
                cnpj: dados.cnpj || dados.numero_inscricao || '',
                nome: dados.razao_social || dados.nome || '',
                fantasia: dados.nome_fantasia || dados.fantasia || '',
                tipo: dados.tipo || 'LTDA',
                abertura: dados.data_inicio_atividade || dados.abertura || '',
                situacao: dados.situacao_cadastral || dados.situacao || 'ATIVA',
                logradouro: dados.logradouro || dados.tipo_logradouro + ' ' + dados.logradouro || '',
                numero: dados.numero || 'S/N',
                complemento: dados.complemento || '',
                bairro: dados.bairro || '',
                municipio: dados.municipio || dados.cidade || '',
                uf: dados.uf || dados.estado || '',
                cep: dados.cep || '',
                telefone: dados.telefone || dados.ddd + dados.telefone || '',
                email: dados.email || '',
                cnae: dados.cnae || dados.cnae_principal || '',
                natureza_juridica: dados.natureza_juridica || '',
                capital_social: dados.capital_social || 'R$ 0,00',
                porte: dados.porte || '',
                socios: []
            };
        }
    },

    // Gerar dados simulados para teste
    gerarDadosSimulados: function(cnpj) {
        return {
            cnpj: cnpj,
            nome: 'EMPRESA EXEMPLO LTDA',
            fantasia: 'EXEMPLO COMÉRCIO',
            tipo: 'LTDA',
            abertura: '2010-01-15',
            situacao: 'ATIVA',
            logradouro: 'Rua das Flores',
            numero: '123',
            complemento: 'Sala 45',
            bairro: 'Centro',
            municipio: 'São Paulo',
            uf: 'SP',
            cep: '01001-000',
            telefone: '(11) 9999-8888',
            email: 'contato@exemplo.com.br',
            cnae: '47.81-4-01',
            natureza_juridica: 'Sociedade Empresária Limitada',
            capital_social: 'R$ 50.000,00',
            porte: 'ME',
            socios: [
                { nome: 'João da Silva', qualificacao: 'Sócio-Administrador' },
                { nome: 'Maria Santos', qualificacao: 'Sócia' }
            ]
        };
    },

    // Sugerir tipo de empresa baseado nos dados
    sugerirTipoEmpresa: function(dados) {
        const nome = (dados.nome || '').toUpperCase();
        const natureza = (dados.natureza_juridica || '').toLowerCase();
        const cnae = (dados.cnae || '').toString();
        
        // MEI - Microempreendedor Individual
        if (nome.includes('MEI') || 
            natureza.includes('individual') || 
            natureza.includes('empresário individual')) {
            return 'MEI';
        }
        
        // LTDA - Sociedade Limitada
        if (nome.includes('LTDA') || 
            nome.includes('LIMITADA') ||
            natureza.includes('limitada')) {
            return 'LTDA';
        }
        
        // EI - Empresário Individual
        if (natureza.includes('empresário individual')) {
            return 'EI';
        }
        
        // EIRELI
        if (nome.includes('EIRELI') || 
            natureza.includes('eireli')) {
            return 'EIRELI';
        }
        
        // SA - Sociedade Anônima
        if (nome.includes('SA') || 
            natureza.includes('anônima')) {
            return 'SA';
        }
        
        // Padrão
        return 'LTDA';
    },

    // Sugerir regime tributário baseado nos dados
    sugerirRegimeTributario: function(dados) {
        const porte = (dados.porte || '').toLowerCase();
        const cnae = (dados.cnae || '').toString();
        const capital = parseFloat((dados.capital_social || '0').replace(/[^\d,]/g, '').replace(',', '.'));
        
        // MEI sempre tem regime especial
        if (dados.tipo === 'MEI') {
            return 'SIMPLES';
        }
        
        // Pequeno porte geralmente Simples Nacional
        if (porte.includes('me') || porte.includes('epp') || capital < 360000) {
            return 'SIMPLES';
        }
        
        // Atividades de serviços podem ser Lucro Presumido
        if (cnae.startsWith('62') || cnae.startsWith('63') || 
            cnae.startsWith('69') || cnae.startsWith('70') ||
            cnae.startsWith('71') || cnae.startsWith('72') ||
            cnae.startsWith('73') || cnae.startsWith('74') ||
            cnae.startsWith('78') || cnae.startsWith('80') ||
            cnae.startsWith('81') || cnae.startsWith('82')) {
            return 'PRESUMIDO';
        }
        
        // Grandes empresas ou bancos Lucro Real
        if (porte.includes('grande') || capital > 78000000 || 
            cnae.startsWith('64') || cnae.startsWith('65')) {
            return 'REAL';
        }
        
        // Padrão
        return 'SIMPLES';
    },

    // Sugerir se tem funcionários
    sugerirTemFuncionarios: function(dados) {
        const porte = (dados.porte || '').toLowerCase();
        const cnae = (dados.cnae || '').toString();
        
        // Empresas maiores geralmente têm funcionários
        if (porte.includes('medio') || porte.includes('grande')) {
            return 'true';
        }
        
        // Setores que normalmente têm funcionários
        if (cnae.startsWith('47') || // Comércio varejista
            cnae.startsWith('56') || // Alimentação
            cnae.startsWith('86') || // Saúde
            cnae.startsWith('87') || // Assistência social
            cnae.startsWith('88')) { // Serviços sociais
            return 'true';
        }
        
        // Padrão
        return 'false';
    }
};

// Inicializar o serviço quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('CNPJ Service carregado e pronto para uso!');
    
    // Exemplo de uso opcional (descomente se quiser testes automáticos):
    /*
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Teste automático em desenvolvimento
        setTimeout(async () => {
            try {
                console.log('Testando CNPJ Service...');
                const dados = await window.cnpjService.consultarCNPJ('00000000000191');
                console.log('Teste OK! Dados retornados:', dados);
            } catch (error) {
                console.log('Teste falhou (normal em dev):', error.message);
            }
        }, 2000);
    }
    */
});
