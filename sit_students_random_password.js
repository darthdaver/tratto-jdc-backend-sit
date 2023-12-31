const fs = require('fs');
const axios = require('axios');
const dotenv = require('dotenv');
// Load configuration file and environment variables
dotenv.config({ path: ".env" });
const port = process.env.PORT || 3001;
const directoryPath = process.env.HOMEWORK_DB_PATH || './homework_db/repositories';

function generateRandomPassword(length) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let password = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset.charAt(randomIndex);
    }
    return password;
}

async function createUserRepositories() {
    const userRepositoriesIds = [];
    try {
        const allDirectoryFiles = fs.readdirSync(directoryPath);
        const directories = allDirectoryFiles.filter(file => fs.statSync(`${directoryPath}/${file}`).isDirectory());
        for (const directory of directories) {
            const allRepositoryFiles = fs.readdirSync(`${directoryPath}/${directory}`);
            const repositoryFiles = allRepositoryFiles.filter(file => fs.statSync(`${directoryPath}/${directory}/${file}`).isFile());
            let repository = {};
            const repositoryObj = JSON.parse(fs.readFileSync(`${directoryPath}/${directory}/repository.json`));
            delete repositoryObj._id;
            try {
                const result = await axios.post(`http://localhost:${port}/repositories`, { repository: repositoryObj });
                await new Promise(resolve => setTimeout(resolve, ));
                repository = result.data;
                //console.log(repository)
                userRepositoriesIds.push({
                    _id: repository._id,
                    name: repository.projectName
                });
            } catch (error) {
                console.error(error);
            }

            for (const repositoryFile of repositoryFiles) {
                if (
                    repositoryFile == 'net.dv8tion.jda.api.entities.channel.middleman.GuildMessageChannel.json' ||
                    repositoryFile == 'io.lettuce.core.RedisURI.json' ||
                    repositoryFile == 'org.jfree.data.xy.DefaultXYDataset.json' ||
                    repositoryFile == 'org.apache.commons.cli.HelpFormatter.json'
                ) {
                    console.log(`Repository file: ${repositoryFile}`);
                    const repositoryClassObj = JSON.parse(fs.readFileSync(`${directoryPath}/${directory}/${repositoryFile}`));
                    delete repositoryClassObj._id;
                    const repositoryId = repository._id;
                    const result = await axios.post(`http://localhost:${port}/repositories/${repositoryId}/repositoryClasses`, { repositoryClass: { name: repositoryClassObj.name, jDoctorConditions: [] } });
                    await new Promise(resolve => setTimeout(resolve, 100));
                    const repositoryClass = result.data;
                    const repositoryClassId = repositoryClass._id;
                    for (const jDoctorConditionObj of repositoryClassObj.jDoctorConditions) {
                        delete jDoctorConditionObj._id;
                        delete jDoctorConditionObj.source._id;
                        delete jDoctorConditionObj.operation._id;
                        delete jDoctorConditionObj.identifiers._id;
                        const result = await axios.post(`http://localhost:${port}/repositories/${repositoryId}/repositoryClasses/${repositoryClassId}/jdoctorconditions`, { jDoctorCondition: {
                                ...jDoctorConditionObj,
                                pre: [],
                                post: [],
                                throws: []
                            } });
                        await new Promise(resolve => setTimeout(resolve, 100));
                        const jDoctorCondition = result.data;
                        const jDoctorConditionId = jDoctorCondition._id;
                        for (const preconditionObj of jDoctorConditionObj.pre) {
                            delete preconditionObj._id;
                            const result = await axios.post(`http://localhost:${port}/repositories/${repositoryId}/repositoryClasses/${repositoryClassId}/jdoctorconditions/${jDoctorConditionId}/pre`, { condition: preconditionObj });
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                        for (const postconditionObj of jDoctorConditionObj.post) {
                            delete postconditionObj._id;
                            const result = await axios.post(`http://localhost:${port}/repositories/${repositoryId}/repositoryClasses/${repositoryClassId}/jdoctorconditions/${jDoctorConditionId}/post`, { condition: postconditionObj });
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                        for (const throwsconditionObj of jDoctorConditionObj.throws) {
                            delete throwsconditionObj._id;
                            const result = await axios.post(`http://localhost:${port}/repositories/${repositoryId}/repositoryClasses/${repositoryClassId}/jdoctorconditions/${jDoctorConditionId}/throws`, { condition: throwsconditionObj });
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                    }
                }
            }
        }
        return userRepositoriesIds;
    } catch (error) {
        console.error(error);
    }
}

(async function uploadStudents() {
    try{
        const students_emails = JSON.parse(fs.readFileSync('sit_students.json', 'utf8'));
        const students = [];
        for (const email of students_emails) {
            // Generate a random password of a specified length
            const password = generateRandomPassword(12);
            const repositoriesIds = await createUserRepositories();

            console.log("Repositories IDs:");
            console.log(repositoriesIds);

            const student = {
                email: email,
                password: password,
                repositories: repositoriesIds
            };
            console.log("Student:");
            console.log(student)

            const result = await axios.post(`http://localhost:${port}/users/signup`, student);
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log(`Student added.`)
            students.push(student);
        }
        fs.writeFileSync('sit_students_passwords.json', JSON.stringify(students, null, 4), (err) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log("JSON data has been saved.");
        });
    } catch (error) {
        console.error(error);
    }
})();
