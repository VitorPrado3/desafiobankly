const routes = require('express').Router()
const axios = require('axios')
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

const fs = require('fs');
const { json } = require('express');

module.exports = routes

routes.post('/fund-transfer', async (req, res) => {

    const { accountOrigin, value, accountDestination } = req.body

    const idTransaction = uuidv4()
    const now = new Date()

    if (!accountOrigin || !value || !accountDestination) {
        return res.status(400).json({
            message: "Campo x requerido"
        })
    }

    let responseAccountDebitor;
    let responseAccountCreditor;

    await axios.get(`${process.env.URL_CONTAS}/${accountOrigin}`)
        .then(resp => {
            responseAccountDebitor = resp
        })
        .catch(err => {
            responseAccountDebitor = err.response
        })

    if (responseAccountDebitor.status == 404) {
        return res.status(404).json({
            message: `Conta de débito ${accountOrigin} não encontrada.`
        })
    }

    if (responseAccountDebitor.status == 500) {
        return res.status(500).json({
            message: `Tivemos um problema para verificar a conta, tente novamente mais tarde`,
        })
    }

    await axios.get(`${process.env.URL_CONTAS}/${accountDestination}`)
        .then(resp => {
            responseAccountCreditor = resp
        })
        .catch(err => {
            responseAccountCreditor = err.response
        })

    if (responseAccountCreditor.status == 404) {
        return res.status(404).json({
            message: `Conta de crédito ${accountDestination} não encontrada.`
        })
    }

    if (responseAccountCreditor.status == 500) {
        return res.status(500).json({
            message: `Tivemos um problema para verificar a conta, tente novamente mais tarde`
        })
    }

    let responseTransactionCreditor;
    let responseTransactionDebitor;

    await axios.post(`${process.env.URL_CONTAS}`, {
        accountNumber: accountDestination,
        value: value
    })
        .then(resp => {
            responseTransactionCreditor = resp
        })
        .catch(err => {
            responseTransactionCreditor = err.response
        })

    await axios.post(`${process.env.URL_CONTAS}`, {
        accountNumber: accountOrigin,
        value: -1 * (value)
    })
        .then(resp => {
            responseTransactionDebitor = resp
        })
        .catch(err => {
            responseTransactionDebitor = err.response
        })



    if (responseTransactionCreditor.status == 200 && responseTransactionDebitor.status == 200) {
        const content = { date: now, transactionId: idTransaction, method: 'POST', path: '/fund-transfer', status: 'Confirmed' }

        const allFiles = fs.readFileSync("../bankly/logs/logs.txt", 'utf-8', async function (err) {
            if (err) throw err;
        });

        const array = JSON.parse(allFiles)
        array.push(content)

        await fs.writeFileSync("../bankly/logs/logs.txt", JSON.stringify(array), function (err) {
            if (err) throw err;
        });
        return res.status(200).json({
            transactionId: idTransaction
        })
    }

    return res.status(500).json({
        message: 'Problema com a transação'
    })
})

routes.get('/status-transfer/:transactionId', async (req, res) => {

    const transactionId = req.params.transactionId
    const now = new Date()

    const allFiles = fs.readFileSync("../bankly/logs/logs.txt", 'utf-8', async function (err) {
        if (err) throw err;
    });

    const jsonFiles = JSON.parse(allFiles)

    const foundLog = jsonFiles.filter(item => item.transactionId == transactionId)

    if (foundLog) {

        const content = { date: now, transactionId: transactionId, method: 'GET', path: '/status-transfer', status: 'Sucesso' }

        const allFiles = fs.readFileSync("../bankly/logs/logs.txt", 'utf-8', function (err) {
            if (err) throw err;
        });

        const array = JSON.parse(allFiles)
        array.push(content)

        await fs.writeFileSync("../bankly/logs/logs.txt", JSON.stringify(array), function (err) {
            if (err) throw err;
        });

        return res.status(200).json(foundLog)
    }

    res.status(404).json({
        message: `Log com transactionId: ${transactionId} não encontrado`
    })

})